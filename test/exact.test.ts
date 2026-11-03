import { describe, expect, it } from "vitest";
import { ALL_CREATURES } from "~/data";
import {
  crossings,
  exactCrossings,
  isUntangledOnChain,
  packEdges,
  scramble,
  solvedLayout,
  toChainPositions,
} from "~/engine";

describe("the chain's own crossing test", () => {
  it("packs an edge list the way the contract reads it", () => {
    expect(
      packEdges([
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ]),
    ).toBe("0x0001010202030300");
  });

  it("keeps every position inside the contract's grid", () => {
    for (const creature of ALL_CREATURES) {
      const { xs, ys } = toChainPositions(solvedLayout(creature.nodes, 12));
      for (const v of [...xs, ...ys]) {
        expect(v).toBeGreaterThanOrEqual(0n);
        expect(v).toBeLessThanOrEqual(1_000_000n);
      }
    }
  });

  // This is the whole point: a board the game calls solved has to be a board the contract
  // calls solved, or the player pays gas to be told no.
  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))(
    "%s agrees with the float engine on its solved layout",
    (_id, creature) => {
      for (const pad of [8, 10, 12]) {
        const pos = solvedLayout(creature.nodes, pad);
        expect(crossings(pos, creature.edges)).toHaveLength(0);
        expect(isUntangledOnChain(pos, creature.edges)).toBe(true);
      }
    },
  );

  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))(
    "%s agrees with the float engine on tangled boards too",
    (_id, creature) => {
      for (let seed = 0; seed < 25; seed++) {
        const pos = scramble(creature, seed, 12);
        if (!pos) continue;
        const floats = crossings(pos, creature.edges).length;
        const { xs, ys } = toChainPositions(pos);
        expect(exactCrossings(xs, ys, creature.edges), `seed ${seed}`).toBe(floats);
      }
    },
  );
});
