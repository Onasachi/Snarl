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
