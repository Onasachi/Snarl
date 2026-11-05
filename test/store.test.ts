import { beforeEach, describe, expect, it, vi } from "vitest";
import { MOON_PHASES, MOON_REWARD_NUDGES, NUDGES_PER_DAY } from "~/game/progress";
import { useGame } from "~/game/store";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

beforeEach(async () => {
  await useGame.persist.rehydrate();
  useGame.setState({
    moon: 0,
    moonDimmedFor: null,
    lastDailyDay: null,
    lastDailyAt: null,
    extraNudges: 0,
    nudges: 0,
    nudgeDay: null,
  });
});

const solve = (day: number) =>
  useGame.getState().recordDailySolved(`2026-11-${String(day).padStart(2, "0")}`);

describe("Daily Snarl rewards", () => {
  it("pays seven nudges on the seventh solve of each cycle, and keeps them across refills", () => {
    for (let day = 1; day <= MOON_PHASES * 2; day++) {
      expect(solve(day)).toBe(day % MOON_PHASES === 0 ? MOON_REWARD_NUDGES : 0);
    }
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES * 2);
    useGame.getState().openDay("2026-11-15");
    expect(useGame.getState().nudges).toBe(NUDGES_PER_DAY);
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES * 2);
  });

  it("records a day once even if completion is delivered twice", () => {
    for (let day = 1; day <= 7; day++) solve(day);
    const state = useGame.getState();
    expect(solve(7)).toBeNull();
    expect(solve(6)).toBeNull();
    expect(useGame.getState().moon).toBe(MOON_PHASES);
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES);
    expect(useGame.getState().lastDailyAt).toBe(state.lastDailyAt);
    expect(useGame.getState().lastDailyDay).toBe("2026-11-07");
  });

  it("does not repay a completed moon after a break", () => {
    for (let day = 1; day <= 7; day++) solve(day);
    useGame.getState().openDay("2026-11-10");
    expect(useGame.getState().moon).toBe(MOON_PHASES);
    expect(solve(10)).toBe(0);
    expect(useGame.getState().moon).toBe(1);
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES);
  });

  it("dims only once for a gap, including repeated opens and a later return", () => {
    for (let day = 1; day <= 4; day++) solve(day);
    const { openDay } = useGame.getState();
    openDay("2026-11-06");
    openDay("2026-11-06");
    openDay("2026-11-09");
    expect(useGame.getState().moon).toBe(3);
    expect(solve(9)).toBe(0);
    expect(useGame.getState().moon).toBe(4);
    openDay("2026-11-11");
    expect(useGame.getState().moon).toBe(3);
  });

  it("applies a missed-day gap even when a solve arrives before openDay", () => {
    for (let day = 1; day <= 6; day++) solve(day);
    expect(solve(9)).toBe(0);
    expect(useGame.getState().moon).toBe(6);
    expect(useGame.getState().extraNudges).toBe(0);
  });

  it("spends the daily allowance before saved rewards and refills only on a new day", () => {
    for (let day = 1; day <= 7; day++) solve(day);
    const { spendNudge, openDay } = useGame.getState();
    for (let nudge = 0; nudge < NUDGES_PER_DAY; nudge++) spendNudge();
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES);
    spendNudge();
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES - 1);
    openDay("2026-11-07");
    expect(useGame.getState().nudges).toBe(0);
    openDay("2026-11-08");
    expect(useGame.getState().nudges).toBe(NUDGES_PER_DAY);
    expect(useGame.getState().extraNudges).toBe(MOON_REWARD_NUDGES - 1);
  });
});
