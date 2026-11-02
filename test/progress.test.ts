import { describe, expect, it } from "vitest";
import {
  creatureForPlay,
  dayKey,
  grownMoon,
  MOON_PHASES,
  moonAfterGap,
  moonLabel,
  NUDGES_PER_DAY,
  nudgesForDay,
  previousDay,
  TUTORIAL_KNOTS,
} from "~/game/progress";

describe("dayKey", () => {
  it("uses the player's own calendar day", () => {
    expect(dayKey(new Date(2026, 10, 2, 23, 59))).toBe("2026-11-02");
    expect(dayKey(new Date(2026, 0, 5, 0, 1))).toBe("2026-01-05");
  });

  it("steps back over month and year ends", () => {
    expect(previousDay("2026-11-02")).toBe("2026-11-01");
    expect(previousDay("2026-11-01")).toBe("2026-10-31");
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
    expect(previousDay("2028-03-01")).toBe("2028-02-29");
  });
});

describe("nudges", () => {
  it("refills at midnight and not before", () => {
    expect(nudgesForDay("2026-11-02", "2026-11-02", 1)).toBe(1);
    expect(nudgesForDay("2026-11-02", "2026-11-02", 0)).toBe(0);
    expect(nudgesForDay("2026-11-01", "2026-11-02", 0)).toBe(NUDGES_PER_DAY);
    expect(nudgesForDay(null, "2026-11-02", 0)).toBe(NUDGES_PER_DAY);
  });
});

describe("the streak moon", () => {
  it("holds while the player keeps up", () => {
    expect(moonAfterGap(4, "2026-11-02", "2026-11-02")).toBe(4);
    expect(moonAfterGap(4, "2026-11-01", "2026-11-02")).toBe(4);
  });

  // The copy promises "it lost one phase", so a fortnight away costs the same as a day.
  it("dims by exactly one phase, however long the gap", () => {
    expect(moonAfterGap(4, "2026-10-31", "2026-11-02")).toBe(3);
    expect(moonAfterGap(4, "2026-09-01", "2026-11-02")).toBe(3);
  });

  it("never goes below new moon, and never above full", () => {
    expect(moonAfterGap(0, "2026-09-01", "2026-11-02")).toBe(0);
    expect(moonAfterGap(1, "2026-09-01", "2026-11-02")).toBe(0);
    expect(grownMoon(MOON_PHASES)).toBe(MOON_PHASES);
    expect(grownMoon(0)).toBe(1);
  });

  it("reads as a phase, not a number", () => {
    expect(moonLabel(0)).toBe("New moon");
    expect(moonLabel(4)).toBe("Day 4 of 7");
    expect(moonLabel(MOON_PHASES)).toBe("Full moon");
  });
});

describe("the running order", () => {
  it("teaches with three knots, ending on a real creature", () => {
    expect(TUTORIAL_KNOTS).toHaveLength(3);
    expect(TUTORIAL_KNOTS[0]?.id).toBe("bub");
    expect(TUTORIAL_KNOTS[2]?.id).toBe("pip");
  });

  it("wraps around World 1 rather than running out", () => {
    expect(creatureForPlay(1).id).toBe("dot");
    expect(creatureForPlay(10).id).toBe(creatureForPlay(0).id);
  });
});
