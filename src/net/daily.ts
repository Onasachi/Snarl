import { dailySeed } from "~/game/daily";

/**
 * Optional. With no API configured the game is still whole: puzzles, the pond and the
 * streak all work offline. The only thing the server adds is the number of other people
 * who freed today's rare Snarl.
 */
const BASE = import.meta.env.VITE_API_URL as string | undefined;

const TIMEOUT_MS = 4000;

async function call<T>(path: string, init?: RequestInit): Promise<T | null> {
  if (!BASE) return null;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE}${path}`, { ...init, signal: abort.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // Offline, blocked, slow, or not deployed. The count simply does not appear.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** How many people have freed today's rare Snarl, or null if we cannot say. */
export const fetchDailyCount = (day: string): Promise<{ freed: number } | null> =>
  call<{ freed: number }>(`/daily/${day}`);

/**
 * Tell the server this player freed it. The returned count includes them.
 *
 * This is a social number, not a score: there is no identity behind it yet, so it is
 * inflatable by anyone with curl. Nothing of value may be built on it — the G$ rewards in
 * Phase 5 need the verified-identity path instead.
 */
export const reportDailySolved = (day: string, moves: number): Promise<{ freed: number } | null> =>
  call<{ freed: number }>(`/daily/${day}/solved`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ moves, seed: dailySeed(day) }),
  });
