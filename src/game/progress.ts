import { CREATURES, TUTORIAL } from "~/data";
import type { Creature } from "~/engine";

/** Nudges a player gets each day. */
export const NUDGES_PER_DAY = 3;
/** Phases in the streak moon: new moon to full. */
export const MOON_PHASES = 7;

/**
 * The tutorial is three knots, not two: Bub and Nib teach the drag, and the third is a
 * real World 1 creature so the first pond has something that was properly earned.
 */
export const TUTORIAL_KNOTS: readonly Creature[] = [TUTORIAL[0]!, TUTORIAL[1]!, CREATURES[0]!];

/**
 * Local calendar day. Days are the player's own: a Daily Snarl belongs to the morning it
 * is solved in, not to a timezone far away.
 */
export const dayKey = (date: Date = new Date()): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const previousDay = (key: string): string => {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dayKey(date);
};

/** Nudges come back at midnight, three of them, however many were left. */
export const nudgesForDay = (storedDay: string | null, today: string, stored: number): number =>
  storedDay === today ? stored : NUDGES_PER_DAY;

/**
 * The streak moon. Solving the Daily Snarl grows it a phase; missing a day dims it by one
 * and no more, however many days were missed. Deliberately forgiving: the moon is a
 * reason to come back, not a punishment for having a life.
 */
export const moonAfterGap = (moon: number, lastDailyDay: string | null, today: string): number => {
  if (moon <= 0) return 0;
  if (lastDailyDay === null) return moon;
  if (lastDailyDay === today || lastDailyDay === previousDay(today)) return moon;
  return Math.max(0, moon - 1);
};

export const grownMoon = (moon: number): number => Math.min(MOON_PHASES, moon + 1);

export const moonLabel = (moon: number): string => {
  if (moon >= MOON_PHASES) return "Full moon";
  if (moon <= 0) return "New moon";
  return `Day ${moon} of ${MOON_PHASES}`;
};

/**
 * World 1 in order, wrapping. The tutorial already freed the first creature, so ordinary
 * play starts at the second one.
 */
export const creatureForPlay = (playIndex: number): Creature =>
  CREATURES[playIndex % CREATURES.length]!;

/** "World 1 · 4" — counts every knot the player has met, tutorial included. */
export const playCaption = (playIndex: number): string =>
  `World 1 · ${((playIndex % CREATURES.length) + 1).toString()}`;
