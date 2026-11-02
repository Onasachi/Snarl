import { RARE } from "~/data";
import type { Creature } from "~/engine";
import { dayKey } from "./progress";

/** The Daily Snarl is always the rare one. */
export const DAILY_CREATURE: Creature = RARE;

/**
 * FNV-1a over the day string. Everyone on Earth gets the same knot on the same date, and
 * a server can derive it from the date alone to check a submitted solve.
 *
 * This is a wire format, not an implementation detail: changing it changes everyone's
 * puzzle and invalidates any solve the server has already recorded.
 */
export function dailySeed(day: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < day.length; i++) {
    hash ^= day.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Keep it a safe positive integer: the scrambler multiplies the seed.
  return (hash >>> 0) % 1_000_000;
}

export const isDailySolved = (lastDailyDay: string | null, today: string = dayKey()): boolean =>
  lastDailyDay === today;

/** Milliseconds until the next local midnight, when a new rare Snarl arrives. */
export function msUntilTomorrow(now: Date = new Date()): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

/** "15h 46m", "46m", or "under a minute" — never a bare countdown of seconds. */
export function formatCountdown(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 1) return "under a minute";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 1) return `${rest}m`;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

/** "You freed it at 08:14" — the player's own clock, 24 hour, zero padded. */
export const formatClock = (at: number): string => {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
