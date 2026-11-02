import { describe, expect, it } from "vitest";
import { ALL_CREATURES, CREATURES, RARE, TUTORIAL } from "~/data";
import type { Creature, Pt } from "~/engine";
import {
  crossings,
  crossingsInvolving,
  crossingTouchesBead,
  intersection,
  isSolved,
  nudge,
  rng,
  scramble,
  solvedLayout,
} from "~/engine";

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
/** Creatures the scrambler has to tangle. Bub ships a fixed opening knot instead. */
const SCRAMBLED = ALL_CREATURES.filter((c) => !c.scrambled);

const totalCrossings = (c: Creature, pos: readonly Pt[]) => crossings(pos, c.edges).length;

describe("roster", () => {
  it("has 2 tutorial knots, 10 World 1 creatures and 1 rare", () => {
    expect(TUTORIAL).toHaveLength(2);
    expect(CREATURES).toHaveLength(10);
    expect(RARE.rare).toBe(true);
    expect(new Set(ALL_CREATURES.map((c) => c.id)).size).toBe(ALL_CREATURES.length);
  });

  // The guarantee the whole game rests on: the authored shape is a valid solution, so
  // every puzzle can be solved by returning the beads to it.
  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))(
    "%s is planar at its authored layout",
    (_id, c) => {
      for (const pad of [8, 10, 12]) {
        expect(crossings(solvedLayout(c.nodes, pad), c.edges)).toHaveLength(0);
      }
    },
  );

  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))("%s is well formed", (_id, c) => {
    expect(c.nodes.length).toBeGreaterThanOrEqual(4);
    expect(c.eye).toBeGreaterThanOrEqual(0);
    expect(c.eye).toBeLessThan(c.nodes.length);
    expect(c.par).toBeGreaterThan(0);

    const seen = new Set<string>();
    for (const [a, b] of c.edges) {
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(c.nodes.length);
      expect(b).toBeLessThan(c.nodes.length);
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }

    // Every bead is attached to something, or it would float untethered.
    const attached = new Set(c.edges.flat());
    expect(attached.size).toBe(c.nodes.length);
  });

  it("gets harder: beads and par both climb across World 1", () => {
    const pars = CREATURES.map((c) => c.par);
    const beads = CREATURES.map((c) => c.nodes.length);
    expect(pars).toEqual([...pars].sort((a, b) => a - b));
    expect(beads).toEqual([...beads].sort((a, b) => a - b));
  });
});

describe("intersection", () => {
  it("finds the middle of a plain X", () => {
    expect(intersection([0, 0], [10, 10], [0, 10], [10, 0])).toEqual([5, 5]);
  });

  it("ignores parallel and collinear segments", () => {
    expect(intersection([0, 0], [10, 0], [0, 5], [10, 5])).toBeNull();
    expect(intersection([0, 0], [10, 0], [2, 0], [8, 0])).toBeNull();
  });

  it("does not count a shared endpoint as a crossing", () => {
    expect(intersection([0, 0], [10, 10], [10, 10], [20, 0])).toBeNull();
    expect(intersection([0, 0], [10, 10], [5, 5], [20, 0])).toBeNull();
  });

  it("ignores segments that would only meet past their ends", () => {
    expect(intersection([0, 0], [1, 1], [8, 10], [10, 8])).toBeNull();
  });
});

describe("crossings", () => {
  const edges = [
    [0, 1],
    [2, 3],
  ] as const;

  it("counts a crossing once, with the edge pair that made it", () => {
    const pos: Pt[] = [
      [0, 0],
      [10, 10],
      [0, 10],
      [10, 0],
    ];
    expect(crossings(pos, edges)).toEqual([{ i: 0, j: 1, x: 5, y: 5 }]);
  });

  it("never counts two strings that meet at their own bead", () => {
    // A fan of edges all sharing bead 0, pointing every which way.
    const pos: Pt[] = [
      [50, 50],
      [10, 10],
      [90, 20],
      [20, 90],
      [80, 80],
    ];
    const fan = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ] as const;
    expect(crossings(pos, fan)).toHaveLength(0);
  });

  it("agrees with isSolved", () => {
    const c = CREATURES[0]!;
    expect(isSolved(solvedLayout(c.nodes), c.edges)).toBe(true);
    const tangled = scramble(c, 3)!;
    expect(isSolved(tangled, c.edges)).toBe(false);
  });
});

describe("rng", () => {
  // Locked stream. A seed has to mean the same tangle on every device, and on the server
  // when it verifies a Daily Snarl, so these numbers are a contract, not a snapshot.
  it("produces the documented mulberry32 stream", () => {
    const r = rng(1);
    expect([r(), r(), r(), r()]).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
    ]);
    const r2 = rng(12345);
    expect([r2(), r2()]).toEqual([0.9797282677609473, 0.3067522644996643]);
  });

  it("stays in [0, 1)", () => {
    const r = rng(7);
    for (let i = 0; i < 5000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("solvedLayout", () => {
  it("centres the shape and keeps the padding clear", () => {
    const c = RARE;
    const pad = 12;
    const pos = solvedLayout(c.nodes, pad);
    for (const [x, y] of pos) {
      expect(x).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(y).toBeGreaterThanOrEqual(pad - 1e-9);
      expect(x).toBeLessThanOrEqual(100 - pad + 1e-9);
      expect(y).toBeLessThanOrEqual(100 - pad + 1e-9);
    }
  });

  it("keeps the aspect ratio, so creatures are not squashed", () => {
    const nodes: Pt[] = [
      [0, 0],
      [40, 0],
      [40, 10],
      [0, 10],
    ];
    const [a, b, c] = solvedLayout(nodes, 10) as [Pt, Pt, Pt];
    expect(b[0] - a[0]).toBeCloseTo(4 * (c[1] - b[1]), 9);
  });
});

describe("scramble", () => {
  it("hands back the tutorial's fixed opening knot", () => {
    const bub = TUTORIAL[0]!;
    expect(bub.scrambled).toBeDefined();
    const a = scramble(bub, 0)!;
    const b = scramble(bub, 99)!;
    expect(a).toEqual(b);
    expect(a).toEqual(bub.scrambled?.map((p) => [...p]));
    // Mutating the board must not rewrite the roster.
    a[0] = [1, 1];
    expect(scramble(bub, 0)![0]).not.toEqual([1, 1]);
  });

  it.each(SCRAMBLED.map((c) => [c.id, c] as const))("%s always comes out tangled", (_id, c) => {
    for (const seed of SEEDS) {
      const pos = scramble(c, seed);
      expect(pos, `seed ${seed} produced no tangle`).not.toBeNull();
      expect(totalCrossings(c, pos!), `seed ${seed} opened already solved`).toBeGreaterThan(0);
    }
  });

  it.each(SCRAMBLED.map((c) => [c.id, c] as const))("%s lands in its band", (_id, c) => {
    const [lo, hi] = c.target ?? [2, 3];
    const counts = SEEDS.map((seed) => totalCrossings(c, scramble(c, seed)!));

    // Never over the band. Opening above it is a difficulty spike: a knot handed to the
    // player with more crossings than the design intends, against an unchanged par.
    for (const [i, k] of counts.entries()) {
      expect(
        k,
        `seed ${SEEDS[i]} opened ${k} crossings, band is [${lo}, ${hi}]`,
      ).toBeLessThanOrEqual(hi);
    }

    // Under the band is only a slightly kinder knot, so that is a rate, not a rule.
    const inBand = counts.filter((k) => k >= lo).length;
    expect(inBand / counts.length).toBeGreaterThanOrEqual(0.9);
  });

  it("opens a puzzle fast enough to feel instant", () => {
    // Shelby and Ollie take the repair path, which is the slow one.
    for (const c of [CREATURES[8]!, CREATURES[9]!]) {
      const t0 = performance.now();
      for (const seed of SEEDS.slice(0, 10)) scramble(c, seed);
      const each = (performance.now() - t0) / 10;
      expect(each, `${c.id} took ${each.toFixed(0)}ms per open`).toBeLessThan(120);
    }
  });

  it("is deterministic, and stays inside the padding", () => {
    for (const c of SCRAMBLED) {
      for (const seed of [0, 5, 41]) {
        const a = scramble(c, seed, 12)!;
        expect(scramble(c, seed, 12)).toEqual(a);
        for (const [x, y] of a) {
          expect(x).toBeGreaterThanOrEqual(12);
          expect(y).toBeGreaterThanOrEqual(12);
          expect(x).toBeLessThanOrEqual(88);
          expect(y).toBeLessThanOrEqual(88);
        }
      }
    }
  });

  it("gives different seeds different knots", () => {
    const c = CREATURES[4]!;
    const shapes = new Set(SEEDS.map((s) => JSON.stringify(scramble(c, s))));
    expect(shapes.size).toBeGreaterThan(SEEDS.length * 0.8);
  });
});

describe("nudge", () => {
  it.each(SCRAMBLED.map((c) => [c.id, c] as const))(
    "%s: a nudge with gain removes exactly that many crossings",
    (_id, c) => {
      for (const seed of SEEDS.slice(0, 12)) {
        const pos = scramble(c, seed)!;
        const before = totalCrossings(c, pos);
        const n = nudge(pos, c.edges);

        expect(n.i).toBeGreaterThanOrEqual(0);
        expect(n.i).toBeLessThan(pos.length);

        const after = pos.map((p) => [...p] as Pt);
        after[n.i] = n.to;
        // Moving one bead can only change crossings on its own strings, so the hint's
        // gain is the whole change in the counter the player is watching.
        expect(totalCrossings(c, after)).toBe(before - n.gain);
      }
    },
  );

  it("finds a real move on a knot that only needs one", () => {
    const bub = TUTORIAL[0]!;
    const pos = scramble(bub, 0)!;
    expect(totalCrossings(bub, pos)).toBeGreaterThan(0);
    const n = nudge(pos, bub.edges);
    expect(n.gain).toBeGreaterThan(0);
  });
});

describe("crossingsInvolving", () => {
  // The drag loop trusts this to match a full recount. If it drifts, the live counter
  // disagrees with the solve check and a solved puzzle stops registering.
  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))(
    "%s matches a full recount, bead by bead",
    (_id, c) => {
      for (const seed of [2, 17]) {
        const pos = scramble(c, seed) ?? solvedLayout(c.nodes);
        const all = crossings(pos, c.edges);
        for (let bead = 0; bead < pos.length; bead++) {
          const expected = all.filter((x) => crossingTouchesBead(x, c.edges, bead));
          const actual = crossingsInvolving(bead, pos, c.edges);
          const key = (x: { i: number; j: number }) => `${x.i}-${x.j}`;
          expect(actual.map(key).sort()).toEqual(expected.map(key).sort());
        }
      }
    },
  );
});
