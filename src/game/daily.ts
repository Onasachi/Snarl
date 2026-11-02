import { RARE } from "~/data";
import type { Creature } from "~/engine";
import { dayKey } from "./progress";
import { seedFromString } from "./seed";

/** The Daily Snarl is always the rare one. */
export const DAILY_CREATURE: Creature = RARE;

/**
 * Everyone on Earth gets the same knot on the same date, and a server can derive it from
 * the date alone to check a submitted solve. Pinned by a test: this is a wire format, and
 * changing it invalidates every solve already recorded.
 */
export const dailySeed = (day: string): number => seedFromString(day);

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
