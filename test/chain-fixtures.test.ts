import { describe, expect, it } from "vitest";
import glint from "~/../contracts/test/fixtures/glint.json";
import weeks from "~/../contracts/test/fixtures/weeks.json";
import { WEEKLY } from "~/data";
import { exactCrossings, packEdges, toChainPositions } from "~/engine/exact";
import { weekId, weekKey } from "~/game/weekly";

/**
 * The contract's copies of the game's own facts.
 *
 * Both files are generated — Glint's shape and the week numbering live here, in the game,
 * and the contract's tests and its deploy scripts read them from `contracts/test/fixtures`.
 * Copies drift, so the copy is checked rather than trusted: if the creature is ever
 * redrawn, or the week numbering changes, this is what says so.
 */
describe("the chain fixture for Glint", () => {
  const { xs, ys } = toChainPositions(WEEKLY.nodes);

  it("is the same creature the game plays", () => {
    expect(glint.id).toBe(WEEKLY.id);
    expect(glint.beads).toBe(WEEKLY.nodes.length);
    expect(glint.edges).toBe(packEdges(WEEKLY.edges));
  });

  it("carries the shape the contract will be shown", () => {
    expect(glint.solved.xs).toEqual(xs.map(String));
    expect(glint.solved.ys).toEqual(ys.map(String));
  });

  it("is untangled by the contract's own rule", () => {
    expect(exactCrossings(xs, ys, WEEKLY.edges)).toBe(0);
  });
});

describe("the week table the owner opens weeks from", () => {
  const HOUR = 3600;

  it("numbers every week the way the game does", () => {
    for (const week of weeks.weeks) {
      // Monday noon UTC is a Monday for every player on earth, so the label does not
      // depend on which timezone this test runs in.
      const label = weekKey(new Date(week.mondayNoonUtc));
      expect(label, week.mondayNoonUtc).toBe(week.label);
      expect(weekId(label)).toBe(week.id);
    }
  });

  it("keeps a week open for as long as it is that week anywhere", () => {
    for (const week of weeks.weeks) {
      const monday = Date.parse(week.mondayNoonUtc) / 1000;
      // It is already Monday at UTC+14 twenty-six hours before it is Monday at UTC-12.
      expect(week.openBy).toBe(monday - 26 * HOUR);
      expect(week.closesAt).toBe(monday + 7 * 24 * HOUR);
      expect(week.sweepableAt).toBe(week.closesAt + 7 * 24 * HOUR);
      // Which means consecutive weeks overlap, and nobody falls between them.
      expect(week.openBy).toBeLessThan(week.closesAt - 7 * 24 * HOUR);
    }
  });

  it("runs in an unbroken line", () => {
    const ids = weeks.weeks.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < weeks.weeks.length; i++) {
      const previous = weeks.weeks[i - 1];
      const current = weeks.weeks[i];
      if (!previous || !current) throw new Error("gap in the table");
      expect(current.openBy).toBeLessThan(previous.closesAt);
    }
  });
});
