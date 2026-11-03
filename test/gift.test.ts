import { describe, expect, it } from "vitest";
import { decodeGift, encodeGift, giftFromHash, giftLink, makeGiftKey } from "~/game/gift";

const gift = { id: "pip", from: "Ada", at: 1_762_000_000_000 };

describe("gift links", () => {
  it("survives the round trip", () => {
    expect(decodeGift(encodeGift(gift))).toEqual(gift);
  });

  it("carries the gift in the fragment, which never reaches a server", () => {
    const link = giftLink("https://snarl.example/", gift);
    expect(link).toContain("#gift=");
    expect(new URL(link).search).toBe("");
    expect(giftFromHash(new URL(link).hash)).toEqual(gift);
  });

  it("handles names that are not ASCII", () => {
    const decoded = decodeGift(encodeGift({ ...gift, from: "Zoë 🐟" }));
    expect(decoded?.from).toBe("Zoë 🐟");
  });

  it("drops an empty sender rather than carrying an empty string", () => {
    expect(decodeGift(encodeGift({ id: "pip", from: "   ", at: 1 }))?.from).toBeUndefined();
  });

  // The link comes from a stranger by way of a chat app. None of it is trusted.
  it("refuses anything that is not a creature we have", () => {
    expect(decodeGift(encodeGift({ id: "not-a-creature", at: 1 }))).toBeNull();
    expect(decodeGift("not base64 at all!!")).toBeNull();
    expect(decodeGift(btoa('{"id":123}'))).toBeNull();
    expect(decodeGift(btoa("[]"))).toBeNull();
    expect(decodeGift(btoa("null"))).toBeNull();
    expect(giftFromHash("#something-else")).toBeNull();
    expect(giftFromHash("")).toBeNull();
  });

  it("caps a sender's name instead of letting it fill the screen", () => {
    const long = "a".repeat(200);
    expect(decodeGift(encodeGift({ id: "pip", from: long, at: 1 }))?.from).toHaveLength(24);
  });

  it("survives a missing timestamp", () => {
    expect(decodeGift(btoa('{"id":"pip"}'))).toEqual({ id: "pip", at: 0 });
  });
});

describe("the one-time key a tip rides on", () => {
  it("is 32 bytes of base64url, and a different one every time", () => {
    const key = makeGiftKey();
    expect(key).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(atob(key.replace(/-/g, "+").replace(/_/g, "/")).length).toBe(32);
    expect(new Set(Array.from({ length: 50 }, makeGiftKey)).size).toBe(50);
  });

  it("survives the round trip, and the link carries it", () => {
    const key = makeGiftKey();
    const withKey = { ...gift, key };
    expect(decodeGift(encodeGift(withKey))?.key).toBe(key);
    expect(giftFromHash(new URL(giftLink("https://snarl.example/", withKey)).hash)?.key).toBe(key);
  });

  it("is absent, not empty, on a gift with no money behind it", () => {
    expect(decodeGift(encodeGift(gift))).not.toHaveProperty("key");
  });

  // Whatever arrives here is about to be handed to a signer.
  it("drops anything that is not shaped like a key", () => {
    for (const bad of ["", "short", `${makeGiftKey()}x`, "!".repeat(43), 42, null, {}]) {
      expect(decodeGift(encodeGift({ ...gift, key: bad as string }))?.key).toBeUndefined();
    }
  });
});
