import { creatureById } from "~/data";
import type { Creature } from "~/engine";

/**
 * A gift is a creature and who it came from, carried in the URL fragment.
 *
 * The fragment never leaves the browser: it is not sent with the request, so a gift link
 * passes through whatever chat app it travels in without the sender's name landing in
 * anyone's server logs. There is nothing to look up and nothing to store.
 */
export interface Gift {
  /** Creature id, as in the roster. */
  id: string;
  /** Optional, and the sender's to choose. */
  from?: string;
  /** When it was made, so a pond can tell two gifts of the same creature apart. */
  at: number;
  /**
   * A one-time key, when there is G$ waiting behind the link.
   *
   * Thirty-two random bytes, and the only copy. The escrow contract files the gift under
   * the address this key derives to, and claiming it means signing with the key — so the
   * link is the money, and this module stays well clear of the signing. No crypto here;
   * the wallet layer does that, lazily, and only if someone attaches a tip.
   */
  key?: string;
}

const PREFIX = "#gift=";
/** Long enough for a name, short enough that nobody pastes a wall of text. */
const MAX_NAME = 24;
/** 32 bytes, base64url, unpadded. */
const KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const toBase64Url = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string): string => {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

/**
 * A fresh key for a gift with money behind it. Generated here, written down nowhere, and
 * gone from this app the moment the link leaves it — which is the point: whoever holds
 * the link holds the gift.
 */
export function makeGiftKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function encodeGift(gift: Gift): string {
  const payload: Gift = { id: gift.id, at: gift.at };
  const from = gift.from?.trim().slice(0, MAX_NAME);
  if (from) payload.from = from;
  if (gift.key && KEY_PATTERN.test(gift.key)) payload.key = gift.key;
  return toBase64Url(JSON.stringify(payload));
}

/** Anything that is not a gift for a creature we actually have comes back as null. */
export function decodeGift(encoded: string): Gift | null {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(encoded));
    if (typeof parsed !== "object" || parsed === null) return null;
    const { id, from, at, key } = parsed as Record<string, unknown>;
    if (typeof id !== "string" || !creatureById(id)) return null;
    return {
      id,
      at: typeof at === "number" && Number.isFinite(at) ? at : 0,
      // Shaped like a key or not there at all. Anything else would be handed to a signer
      // further down, and a stranger's link does not get to choose what that signs.
      ...(typeof key === "string" && KEY_PATTERN.test(key) ? { key } : {}),
      // A name arrives from a stranger's link, so it is trimmed and capped here as well
      // as on the way out.
      ...(typeof from === "string" && from.trim() ? { from: from.trim().slice(0, MAX_NAME) } : {}),
    };
  } catch {
    return null;
  }
}

export const giftLink = (origin: string, gift: Gift): string =>
  `${origin}${PREFIX}${encodeGift(gift)}`;

/** Reads a gift out of a location, if there is one. */
export const giftFromHash = (hash: string): Gift | null =>
  hash.startsWith(PREFIX) ? decodeGift(hash.slice(PREFIX.length)) : null;

export const giftedCreature = (gift: Gift): Creature | undefined => creatureById(gift.id);
