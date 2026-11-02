import { crossingCountFor } from "./geometry";
import type { Edge, Nudge, Pt } from "./types";

/** Grid the hint searches, and how close it may place a bead to another one. */
const STEP = 6;
const MARGIN = 8;
const CLEARANCE = 6;

/**
 * The Nudge hint: one bead, and somewhere it could go that removes at least one crossing.
 * Picks the biggest gain, and the shortest move among equal gains, so the hint reads as
 * "just move this a little" rather than "throw it across the pond".
 *
 * If nothing helps — rare, and only in positions that need two moves — it falls back to
 * the most tangled bead and the middle of its neighbours, with gain 0. The UI shows that
 * the same way, since it is still the bead worth touching.
 */
export function nudge(pos: readonly Pt[], edges: readonly Edge[]): Nudge {
  let best: (Nudge & { distance: number }) | null = null;

  for (let i = 0; i < pos.length; i++) {
    const base = crossingCountFor(i, pos, edges);
    if (!base) continue;
    const from = pos[i]!;

    for (let gx = MARGIN; gx <= 100 - MARGIN; gx += STEP) {
      for (let gy = MARGIN; gy <= 100 - MARGIN; gy += STEP) {
        if (pos.some((q, j) => j !== i && Math.hypot(q[0] - gx, q[1] - gy) < CLEARANCE)) continue;
        const trial = pos.slice() as Pt[];
        trial[i] = [gx, gy];
        const gain = base - crossingCountFor(i, trial, edges);
        if (gain <= 0) continue;
        const distance = Math.hypot(from[0] - gx, from[1] - gy);
        if (!best || gain > best.gain || (gain === best.gain && distance < best.distance)) {
          best = { i, to: [gx, gy], gain, distance };
        }
      }
    }
  }

  if (best) return { i: best.i, to: best.to, gain: best.gain };

  let worst = 0;
  let worstCount = -1;
  for (let i = 0; i < pos.length; i++) {
    const k = crossingCountFor(i, pos, edges);
    if (k > worstCount) {
      worstCount = k;
      worst = i;
    }
  }
  const neighbours = edges
    .filter((e) => e[0] === worst || e[1] === worst)
    .map((e) => pos[e[0] === worst ? e[1] : e[0]]!);
  const count = Math.max(1, neighbours.length);
  return {
    i: worst,
    to: [
      neighbours.reduce((s, q) => s + q[0], 0) / count,
      neighbours.reduce((s, q) => s + q[1], 0) / count,
    ],
    gain: 0,
  };
}
