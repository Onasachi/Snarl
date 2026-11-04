import glint from "~/../contracts/test/fixtures/glint.json";
import weeks from "~/../contracts/test/fixtures/weeks.json";

/**
 * The weeks the pool can be opened for, and the knot each one carries.
 *
 * Generated from the game's own `weekKey`/`weekId` by `scripts/weeks.mjs` and checked
 * against them by `test/chain-fixtures.test.ts`. The admin screen offers these and only
 * these: a week number can be opened once and never again, so a mistyped timestamp would
 * burn that week permanently.
 *
 * `closesAt` is Monday noon UTC, which is Sunday midnight for the last player on earth,
 * and `openBy` is Sunday 10:00 UTC, which is Monday midnight for the first — so weeks
 * overlap by twenty-six hours and nobody falls between them.
 */
export interface WeekPlan {
  label: string;
  id: number;
  openBy: number;
  closesAt: number;
  sweepableAt: number;
}

export const WEEK_PLANS: readonly WeekPlan[] = weeks.weeks.map(
  ({ label, id, openBy, closesAt, sweepableAt }) => ({
    label,
    id,
    openBy,
    closesAt,
    sweepableAt,
  }),
);

/** The knot every week carries: Glint, whose shape the contract is given at open time. */
export const WEEKLY_KNOT = { edges: glint.edges as `0x${string}`, beads: glint.beads };

export const planFor = (id: number): WeekPlan | undefined =>
  WEEK_PLANS.find((plan) => plan.id === id);
