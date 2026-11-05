import { CREATURES, TUTORIAL } from "~/data";
import type { Creature } from "~/engine";

/** Nudges a player gets each day. */
export const NUDGES_PER_DAY = 3;

/**
 * What putting G$ in the week's pot is worth, and the least that is worth doing.
 *
 * A daily GoodDollar claim is about 120 G$. The minimum here is four days of that, not
 * to be greedy but because the transaction costs the same fee whatever it carries: at
 * Celo's floor a contribution has to be a deliberate act or the fee is most of it. This
 * is backing a week, not buying a packet of hints.
 *
 * The free three a day are untouched by any of it. Somebody with no wallet, or no G$,
 * plays exactly the game they played before.
 */
export const POT_MINIMUM_G$ = 500;
export const G$_PER_NUDGE = 100;
/** Past this, more G$ is generosity rather than a purchase. */
export const POT_NUDGE_CAP = 20;

/** How many nudges a contribution earns. Whole nudges only; the remainder is a gift. */
export const nudgesForPot = (g$: number): number =>
  g$ < POT_MINIMUM_G$ ? 0 : Math.min(POT_NUDGE_CAP, Math.floor(g$ / G$_PER_NUDGE));
/** Phases in the streak moon: new moon to full. */
export const MOON_PHASES = 7;

/**
 * What a full moon is for.
 *
 * It used to be for nothing. The moon filled over seven Daily Snarls, said "a visitor is
 * on the way", and no visitor ever came — a week of turning up for a promise the game
 * had no way of keeping. Seven nudges is a real thing to be given: the same thing G$
 * buys, so the streak is the way to earn what money otherwise gets you, and the one
 * reason to come back tomorrow that pays out.
 */
export const MOON_REWARD_NUDGES = 7;

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

/**
 * The moon after another Daily Snarl. A full moon turns rather than sticking: the next
 * solve starts the cycle again, so there is always a next one to work towards.
 */
export const grownMoon = (moon: number): number => (moon >= MOON_PHASES ? 1 : moon + 1);

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
