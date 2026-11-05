import { describe, expect, it } from "vitest";
import { CREATURES } from "~/data";
import { crossings, scramble } from "~/engine";
import { collection, nextExplorationIndex } from "~/game/collection";
import type { FreedCreature } from "~/game/store";
import { type TrailDraft, trailSeed, validDraft } from "~/market/types";

const draft: TrailDraft = {
  title: "A little adventure",
  price: 60n * 10n ** 18n,
  seed: 4294967295,
  creatures: [0, 3, 6],
  palette: 1,
};
describe("trail recipes", () => {
  it("requires three distinct creatures, bounded real prices and a byte-bounded title", () => {
    expect(validDraft(draft)).toBe(true);
    for (const change of [
      { title: "a" },
      { title: "🪷".repeat(20) },
      { price: 1n },
      { price: 10001n * 10n ** 18n },
      { creatures: [0, 0, 1] as const },
      { creatures: [0, 1, 10] as const },
      { palette: 3 },
      { seed: -1 },
    ])
      expect(validDraft({ ...draft, ...change })).toBe(false);
  });
  it("keeps every recipe seed in uint32 and produces repeatable, tangled puzzles", () => {
    for (const start of [0, 42, 2741, 8128, 4294967295])
      for (const step of [0, 1, 2])
        for (const creature of CREATURES) {
          const seed = trailSeed({ ...draft, seed: start }, step);
          expect(seed).toBeGreaterThanOrEqual(0);
          expect(seed).toBeLessThanOrEqual(4294967295);
          const pos = scramble(creature, seed, 12);
          expect(pos, `${creature.id}/${seed}`).not.toBeNull();
          expect(pos).toEqual(scramble(creature, seed, 12));
          expect(crossings(pos!, creature.edges).length).toBeGreaterThan(0);
        }
  });
});
describe("a growing pond", () => {
  it("explores past gifted or purchased creatures, then advances to new mastery seeds", () => {
    const found = [CREATURES[1]!, CREATURES[2]!].map((c, i) => ({
      id: c.id,
      key: String(i),
      at: 0,
      moves: 4,
      underPar: true,
    }));
    expect(nextExplorationIndex(1, found)).toBe(3);
    const all = CREATURES.map((c, i) => ({
      id: c.id,
      key: String(i),
      at: 0,
      moves: 4,
      underPar: true,
    }));
    expect(nextExplorationIndex(1, all)).toBe(10);
    expect(nextExplorationIndex(11, all)).toBe(11);
  });
  const freed = (id: string, k: number, extra: Partial<FreedCreature> = {}): FreedCreature => ({
    id,
    key: `${k}`,
    at: k,
    moves: 5,
    underPar: true,
    ...extra,
  });
  it("counts unique species and never piles duplicates into shared slots", () => {
    const result = collection(
      Array.from({ length: 100 }, (_, k) => freed(CREATURES[k % 10]!.id, k)),
    );
    expect(result.residents).toHaveLength(10);
    expect(result.world).toBe(10);
    expect(result.next).toBeUndefined();
    expect(result.residents.every((e) => e.at >= 90)).toBe(true);
  });
  it("gifts restore the pond but never award a mastery badge", () => {
    const result = collection([freed(CREATURES[0]!.id, 1, { gifted: true })]);
    expect(result.world).toBe(1);
    expect(result.mastered.size).toBe(0);
    expect(result.next?.count).toBe(3);
  });
});
