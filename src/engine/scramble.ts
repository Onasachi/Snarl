import { crossings, solvedLayout } from "./geometry";
import { clamp, rng } from "./rng";
import type { Creature, Pt } from "./types";

/** Attempts before we settle for the closest tangle found. */
const TRIES = 500;

/**
 * Turns a creature's true shape into a knot, by permuting the beads between their own
 * home positions and then rotating and jittering the whole set. Because the beads only
 * ever land on positions from the solved layout, the solution is always reachable: the
 * home layout is planar, so zero crossings is always available.
 *
 * Returns null only if every attempt came out already untangled, which no World 1
 * creature does — the roster test covers it.
 */
export function scramble(creature: Creature, seed: number, pad = 10): Pt[] | null {
  if (creature.scrambled) return creature.scrambled.map((p) => [p[0], p[1]] as Pt);

  const home = solvedLayout(creature.nodes, pad);
  const n = home.length;
  const [lo, hi] = creature.target ?? [2, 3];
  let best: Pt[] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < TRIES; attempt++) {
    const r = rng(seed * 7919 + attempt * 31 + 1);
    let p: Pt[] = home.map((q) => [q[0], q[1]] as Pt);

    const swaps = Math.max(1, Math.round(n * 0.3 + r() * n * 0.4));
    for (let s = 0; s < swaps; s++) {
      const i = Math.floor(r() * n);
      const j = Math.floor(r() * n);
      const tmp = p[i]!;
      p[i] = p[j]!;
      p[j] = tmp;
    }

    const ang = r() * Math.PI * 2;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    p = p.map((q) => {
      const x = q[0] - 50;
      const y = q[1] - 50;
      return [
        clamp(50 + x * ca - y * sa + (r() - 0.5) * 12, pad, 100 - pad),
        clamp(50 + x * sa + y * ca + (r() - 0.5) * 12, pad, 100 - pad),
      ] as Pt;
    });

    const k = crossings(p, creature.edges).length;
    if (k >= lo && k <= hi) return p;

    // Too loose counts worse than too tight: an over-tangled knot still plays.
    const distance = k < lo ? (lo - k) * 3 : k - hi;
    if (k > 0 && distance < bestDistance) {
      bestDistance = distance;
      best = p;
    }
  }

  // Dense rosters — Shelby carries 31 strings on 20 beads — can be impossible to land in
  // band by chance, and opening 11 crossings over par is a difficulty spike rather than a
  // hard knot. Untangle the closest attempt down into the band instead. Only the miss path
  // reaches this, so creatures that already land in band keep exactly the knots they had.
  return best && untangleIntoBand(best, creature.edges, lo, hi);
}

const swap = (pos: Pt[], i: number, j: number): void => {
  const tmp = pos[i]!;
  pos[i] = pos[j]!;
  pos[j] = tmp;
};

/**
 * Walks an over-tangled knot down to `hi` by repeatedly making the single bead swap that
 * removes the most crossings without dropping below `lo`. Swaps keep every bead on a
 * position from the solved layout, so the solution stays reachable. Deterministic: pairs
 * are always considered in the same order. Runs once when a puzzle opens, never per frame.
 */
function untangleIntoBand(pos: Pt[], edges: Creature["edges"], lo: number, hi: number): Pt[] {
  let current = crossings(pos, edges).length;
  // Each pass removes at least one crossing, so this only bounds pathological cases.
  let guard = pos.length * 4;

  while (current > hi && guard-- > 0) {
    let chosen: [number, number] | null = null;
    let chosenCount = current;

    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        swap(pos, i, j);
        const k = crossings(pos, edges).length;
        swap(pos, i, j);
        if (k < chosenCount && k >= lo) {
          chosenCount = k;
          chosen = [i, j];
        }
      }
    }

    // Nothing left that helps without going slack. Keep the tighter knot.
    if (!chosen) break;
    swap(pos, chosen[0], chosen[1]);
    current = chosenCount;
  }

  return pos;
}
