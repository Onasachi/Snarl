import { CREATURES } from "~/data";
import type { Creature } from "~/engine";
import { seedFromString } from "./seed";

/**
 * The Great Untangle: one knot a week that everybody picks at together. The densest
 * creature in World 1 — 24 beads, 29 strings — because a knot meant for a thousand people
 * should not fall over in one sitting.
 */
export const WEEKLY_CREATURE: Creature = CREATURES[9]!;

/**
 * ISO-8601 week, as "2026-W45". Weeks run Monday to Sunday, and the year is the week's
 * own year, which is not always the calendar year around New Year.
 */
export function weekKey(date: Date = new Date()): string {
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // Thursday decides which year the week belongs to.
  const day = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - day + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const week =
    1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const weeklySeed = (week: string): number => seedFromString(week);

/** Milliseconds until the week's knot is replaced, at the end of Sunday. */
export function msUntilNextWeek(now: Date = new Date()): number {
  const daysLeft = 7 - ((now.getDay() + 6) % 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysLeft);
  return end.getTime() - now.getTime();
}

/** "Ends Sunday", "Ends tomorrow", "Ends today". */
export function endsLabel(now: Date = new Date()): string {
  const daysLeft = 7 - ((now.getDay() + 6) % 7);
  if (daysLeft === 1) return "Ends today";
  if (daysLeft === 2) return "Ends tomorrow";
  return "Ends Sunday";
}

/**
 * What the community has done to this week's knot, when a server is there to say.
 * `null` means we cannot say, and the screen then speaks only for this player.
 */
export interface UntangleProgress {
  /** Crossings resolved across everyone. */
  resolved: number;
  /** Crossings the knot started with, times the number of passes it is worth. */
  total: number;
  contributors: number;
}

export const percentFreed = (progress: UntangleProgress): number =>
  progress.total === 0 ? 0 : Math.min(100, Math.round((progress.resolved / progress.total) * 100));

/**
 * Passes at the week's knot, after one more. The count belongs to a week, so the first
 * pass of a new week starts again at one rather than adding to last week's total.
 */
export const nextWeeklySolves = (
  storedWeek: string | null,
  storedSolves: number,
  week: string,
): number => (storedWeek === week ? storedSolves + 1 : 1);
