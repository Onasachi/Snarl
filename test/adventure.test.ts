import { describe, expect, it, vi } from "vitest";
import levels from "~/data/adventure-levels.json";
import { crossings, exactCrossings, solvedLayout, toChainPositions } from "~/engine";
import {
  adventureLevel,
  CHAPTERS,
  expeditionProgress,
  recipeId,
  rescueStars,
  storyMoment,
} from "~/game/adventure";
import { gameRun, runId, runPoints } from "~/game/results";
import { useGame } from "~/game/store";

vi.mock("idb-keyval", () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => {}),
  del: vi.fn(async () => {}),
}));

describe("100 story levels and endless expeditions", () => {
  it("contains five chapters of 20 and a story moment every five levels", () => {
    expect(CHAPTERS).toHaveLength(5);
    expect(levels).toHaveLength(100);
    expect(levels.map((l) => l.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
    expect(levels.filter((l) => storyMoment(l.id))).toHaveLength(20);
    expect(storyMoment(100)?.title).toBe("Water finds its way");
    expect(storyMoment(105)).toBeNull();
  });
  it("keeps every story puzzle within its difficulty band, and has an exact planar solution", () => {
    for (const data of levels) {
      const level = adventureLevel(data.id);
      const lo = level.recovery
        ? 2 + level.chapterIndex
        : 3 + level.chapterIndex * 2 + ((level.id - 1) % 5);
      expect(level.initialCrossings).toBeGreaterThanOrEqual(lo);
      expect(level.initialCrossings).toBeLessThanOrEqual(lo + 1);
      expect(crossings(level.creature.scrambled!, level.creature.edges).length).toBe(
        level.initialCrossings,
      );
      const solution = toChainPositions(solvedLayout(level.creature.nodes, 12));
      expect(exactCrossings(solution.xs, solution.ys, level.creature.edges)).toBe(0);
    }
  });
  it("keeps generated expeditions varied, in bounds and consistent with their scoring", () => {
    expect(new Set(Array.from({ length: 100 }, (_, i) => recipeId(i + 101))).size).toBe(100);
    for (const id of [101, 120, 200, 201, 999, 10000, 100001]) {
      const level = adventureLevel(id);
      const positions = level.creature.scrambled!;
      expect(level.expedition).toBe(true);
      expect(crossings(positions, level.creature.edges).length).toBe(level.initialCrossings);
      expect(positions.flat().every((p) => p >= 4 && p <= 96)).toBe(true);
      const encoded = toChainPositions(positions);
      expect(exactCrossings(encoded.xs, encoded.ys, level.creature.edges)).toBe(
        level.initialCrossings,
      );
    }
  });
  it("requires a solved drawing before building a player-reported record", () => {
    const level = adventureLevel(1);
    expect(() =>
      gameRun(
        "test",
        1,
        level.creature,
        level.creature.scrambled!,
        level.initialCrossings,
        3,
        false,
      ),
    ).toThrow("untangled");
    const result = gameRun(
      "test",
      1,
      level.creature,
      solvedLayout(level.creature.nodes, 12),
      level.initialCrossings,
      3,
      false,
    );
    expect(result.id).toBe(runId("test"));
    expect(result.solutionHash).toMatch(/^0x[\da-f]{64}$/);
    expect(runPoints(5, 3, 4, false)).toBe(75);
    expect(runPoints(5, 3, 4, true)).toBe(50);
    expect(rescueStars(3, 4, true)).toBe(2);
    const invalid = solvedLayout(level.creature.nodes, 12);
    invalid[0] = [Infinity, NaN];
    expect(() => gameRun("invalid", 1, level.creature, invalid, 2, 1, false)).toThrow("untangled");
  });
  it("tracks expedition friends and stars within the current twenty stages", () => {
    const completed = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [101 + i, { stars: 2 }]),
    );
    const first = expeditionProgress(120, completed);
    expect(first.rescued).toBe(20);
    expect(first.stars).toBe(first.starGoal);
    expect(first.found).toBe(first.friends.length);
    const next = expeditionProgress(121, completed);
    expect(next.number).toBe(2);
    expect(next.rescued).toBe(0);
    expect(next.found).toBe(0);
  });
  it("advances once, permits replay without skipping levels, and continues after 100", async () => {
    await useGame.persist.rehydrate();
    useGame.setState({ adventureLevel: 1, adventureResults: {} });
    const result = { moves: 2, stars: 3, crossings: 5, points: 75, assisted: false };
    useGame.getState().completeAdventure(5, result);
    expect(useGame.getState().adventureLevel).toBe(1);
    for (let level = 1; level <= 100; level++) useGame.getState().completeAdventure(level, result);
    expect(useGame.getState().adventureLevel).toBe(101);
    useGame.getState().completeAdventure(5, { ...result, stars: 1 });
    expect(useGame.getState().adventureResults[5]?.stars).toBe(3);
    expect(useGame.getState().adventureLevel).toBe(101);
    useGame.getState().completeAdventure(101, result);
    expect(useGame.getState().adventureLevel).toBe(102);
  });
  it("keeps bought supplies scoped to wallets and preserves usage on progress reset", async () => {
    useGame.setState({ supplyPurchased: {}, supplySpent: {}, nudges: 1, extraNudges: 1 });
    const s = useGame.getState();
    s.syncSupplies("0xABC", { hint: 5, guide: 3, glimpse: 3 });
    expect(s.spendSupply("0xother", "guide")).toBe(false);
    expect(s.spendSupply("0xabc", "guide")).toBe(true);
    s.spendNudge("0xabc");
    s.spendNudge("0xabc");
    expect(useGame.getState().supplySpent["0xabc"]?.hint).toBe(0);
    s.spendNudge("0xabc");
    expect(useGame.getState().supplySpent["0xabc"]?.hint).toBe(1);
    s.syncSupplies("0xabc", { hint: 5, guide: 3, glimpse: 3 });
    expect(useGame.getState().supplySpent["0xabc"]?.guide).toBe(1);
    await s.clearProgress();
    expect(useGame.getState().supplySpent["0xabc"]?.guide).toBe(1);
    expect(useGame.getState().supplyPurchased["0xabc"]?.hint).toBe(5);
  });
});
