import { describe, expect, it } from "vitest";
import { crossings, scramble } from "~/engine";
import {
  DAILY_CREATURE,
  dailySeed,
  formatClock,
  formatCountdown,
  isDailySolved,
  msUntilTomorrow,
} from "~/game/daily";

describe("the daily seed", () => {
  // A wire format: the server derives the same knot from the date to check a solve.
  // If these numbers change, every recorded solve becomes unverifiable.
  it("is pinned to these values", () => {
    expect(dailySeed("2026-11-02")).toBe(132_917);
    expect(dailySeed("2026-11-03")).toBe(355_298);
    expect(dailySeed("2000-01-01")).toBe(323_111);
  });

  it("gives every date its own knot", () => {
    const days = Array.from({ length: 400 }, (_, i) => {
      const d = new Date(2026, 0, 1 + i);
      return dailySeed(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      );
    });
    // A year of dates with no repeats, and none of them degenerate.
    expect(new Set(days).size).toBe(days.length);
    for (const seed of days) {
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(Number.isSafeInteger(seed)).toBe(true);
    }
  });

  it("always produces a solvable, properly tangled rare knot", () => {
    for (let i = 0; i < 120; i++) {
      const d = new Date(2026, 0, 1 + i);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const pos = scramble(DAILY_CREATURE, dailySeed(day), 12);
      expect(pos, `no tangle for ${day}`).not.toBeNull();
      const count = crossings(pos!, DAILY_CREATURE.edges).length;
      expect(count).toBeGreaterThan(0);
      expect(count).toBeLessThanOrEqual(DAILY_CREATURE.target![1]);
    }
  });
});

describe("the once-a-day lock", () => {
  it("only counts today", () => {
    expect(isDailySolved("2026-11-02", "2026-11-02")).toBe(true);
    expect(isDailySolved("2026-11-01", "2026-11-02")).toBe(false);
    expect(isDailySolved(null, "2026-11-02")).toBe(false);
  });
});

describe("the countdown", () => {
  it("counts to the player's own midnight", () => {
    expect(msUntilTomorrow(new Date(2026, 10, 2, 23, 0, 0))).toBe(60 * 60 * 1000);
    expect(msUntilTomorrow(new Date(2026, 10, 2, 8, 14, 0))).toBe((15 * 60 + 46) * 60 * 1000);
  });

  it("reads as time, not as seconds", () => {
    expect(formatCountdown((15 * 60 + 46) * 60 * 1000)).toBe("15h 46m");
    expect(formatCountdown(60 * 60 * 1000)).toBe("1h 00m");
    expect(formatCountdown(46 * 60 * 1000)).toBe("46m");
    expect(formatCountdown(30 * 1000)).toBe("under a minute");
    expect(formatCountdown(-1)).toBe("under a minute");
  });

  it("shows the solve time on the player's own clock", () => {
    expect(formatClock(new Date(2026, 10, 2, 8, 14).getTime())).toBe("08:14");
    expect(formatClock(new Date(2026, 10, 2, 23, 5).getTime())).toBe("23:05");
  });
});

describe("the weekly knot", () => {
  it("names ISO weeks, which do not always match the calendar year", async () => {
    const { weekKey } = await import("~/game/weekly");
    expect(weekKey(new Date(2026, 10, 3))).toBe("2026-W45");
    // 1 January 2027 is a Friday, so it belongs to the last week of 2026.
    expect(weekKey(new Date(2027, 0, 1))).toBe("2026-W53");
    // 4 January 2027 is the Monday that starts 2027's first week.
    expect(weekKey(new Date(2027, 0, 4))).toBe("2027-W01");
  });

  it("holds all week and turns over on Monday", async () => {
    const { weekKey } = await import("~/game/weekly");
    const monday = weekKey(new Date(2026, 10, 2));
    expect(weekKey(new Date(2026, 10, 8, 23, 59))).toBe(monday);
    expect(weekKey(new Date(2026, 10, 9))).not.toBe(monday);
  });

  it("counts down to the end of Sunday", async () => {
    const { endsLabel, msUntilNextWeek } = await import("~/game/weekly");
    expect(endsLabel(new Date(2026, 10, 3))).toBe("Ends Sunday");
    expect(endsLabel(new Date(2026, 10, 7))).toBe("Ends tomorrow");
    expect(endsLabel(new Date(2026, 10, 8))).toBe("Ends today");
    expect(msUntilNextWeek(new Date(2026, 10, 8, 23, 0))).toBe(60 * 60 * 1000);
  });

  it("gives every week its own knot, and a solvable one", async () => {
    const { WEEKLY_CREATURE, weekKey, weeklySeed } = await import("~/game/weekly");
    const seeds = new Set<number>();
    for (let i = 0; i < 60; i++) {
      const week = weekKey(new Date(2026, 0, 1 + i * 7));
      const seed = weeklySeed(week);
      seeds.add(seed);
      const pos = scramble(WEEKLY_CREATURE, seed, 12);
      expect(pos, `no tangle for ${week}`).not.toBeNull();
      expect(crossings(pos!, WEEKLY_CREATURE.edges).length).toBeGreaterThan(0);
    }
    expect(seeds.size).toBe(60);
  });
});

describe("passes at the week's knot", () => {
  it("starts again each week rather than carrying over", async () => {
    const { nextWeeklySolves } = await import("~/game/weekly");
    expect(nextWeeklySolves(null, 0, "2026-W45")).toBe(1);
    expect(nextWeeklySolves("2026-W45", 8, "2026-W45")).toBe(9);
    expect(nextWeeklySolves("2026-W44", 8, "2026-W45")).toBe(1);
  });
});
