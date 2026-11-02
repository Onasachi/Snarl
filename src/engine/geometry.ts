import type { Crossing, Edge, Pt } from "./types";

/** Below this the segments are parallel and we call it no crossing. */
const PARALLEL = 1e-9;
/** Keeps shared endpoints and exact bead hits from reading as crossings. */
const ENDS = 1e-6;

/**
 * Where segments a→b and c→d meet, or null. Strictly interior: segments that only touch
 * at an endpoint do not cross, which is what lets a bead's own strings meet at the bead.
 */
export function intersection(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const d1x = b[0] - a[0];
  const d1y = b[1] - a[1];
  const d2x = d[0] - c[0];
  const d2y = d[1] - c[1];
  const den = d1x * d2y - d1y * d2x;
  if (Math.abs(den) < PARALLEL) return null;
  const t = ((c[0] - a[0]) * d2y - (c[1] - a[1]) * d2x) / den;
  const u = ((c[0] - a[0]) * d1y - (c[1] - a[1]) * d1x) / den;
  if (t <= ENDS || t >= 1 - ENDS || u <= ENDS || u >= 1 - ENDS) return null;
  return [a[0] + t * d1x, a[1] + t * d1y];
}

/** Two edges meeting at a bead are not a crossing. */
export const sharesBead = (e: Edge, f: Edge): boolean =>
  e[0] === f[0] || e[0] === f[1] || e[1] === f[0] || e[1] === f[1];

/**
 * Every crossing in the drawing. O(E²) — Ollie, the worst case in World 1, is 29 edges
 * or about 400 pairs, which is cheap enough to run on drop. During a drag prefer
 * `crossingsTouching` and only recount the edges that actually moved.
 */
export function crossings(pos: readonly Pt[], edges: readonly Edge[]): Crossing[] {
  const out: Crossing[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!;
    const a = pos[e[0]]!;
    const b = pos[e[1]]!;
    for (let j = i + 1; j < edges.length; j++) {
      const f = edges[j]!;
      if (sharesBead(e, f)) continue;
      const p = intersection(a, b, pos[f[0]]!, pos[f[1]]!);
      if (p) out.push({ i, j, x: p[0], y: p[1] });
    }
  }
  return out;
}

/** True once no two strings cross: the whole win condition. */
export const isSolved = (pos: readonly Pt[], edges: readonly Edge[]): boolean =>
  crossings(pos, edges).length === 0;

/**
 * How many crossings sit on the strings attached to one bead. Used to rank beads for
 * the Nudge hint, so the exact number matters less than the ordering it produces.
 */
export function crossingCountFor(bead: number, pos: readonly Pt[], edges: readonly Edge[]): number {
  let k = 0;
  for (const e of edges) {
    if (e[0] !== bead && e[1] !== bead) continue;
    const a = pos[e[0]]!;
    const b = pos[e[1]]!;
    for (const f of edges) {
      if (f === e || sharesBead(e, f)) continue;
      if (intersection(a, b, pos[f[0]]!, pos[f[1]]!)) k++;
    }
  }
  return k;
}

/** Edge indices attached to a bead. */
export const edgesAt = (bead: number, edges: readonly Edge[]): number[] => {
  const out: number[] = [];
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!;
    if (e[0] === bead || e[1] === bead) out.push(i);
  }
  return out;
};

/**
 * Scales and centres an authored shape into the grid with `pad` clear on every side.
 * The result of calling this on a creature's `nodes` is the solution the player is
 * working towards, and the layout the Unfurl animates to.
 */
export function solvedLayout(nodes: readonly Pt[], pad = 10): Pt[] {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of nodes) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  const s = (100 - 2 * pad) / Math.max(w, h);
  const ox = (100 - w * s) / 2;
  const oy = (100 - h * s) / 2;
  return nodes.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s] as Pt);
}

/** True when either edge of the crossing is attached to `bead`. */
export const crossingTouchesBead = (c: Crossing, edges: readonly Edge[], bead: number): boolean => {
  const e = edges[c.i]!;
  const f = edges[c.j]!;
  return e[0] === bead || e[1] === bead || f[0] === bead || f[1] === bead;
};

/**
 * Only the crossings that involve a string attached to `bead`. While one bead is being
 * dragged these are the only ones that can change, so the drag loop recounts just these
 * and keeps the rest from drag start:
 *
 *   const fixed = crossings(pos, edges).filter((c) => !crossingTouchesBead(c, edges, bead));
 *   // per frame: fixed.concat(crossingsInvolving(bead, pos, edges))
 */
export function crossingsInvolving(
  bead: number,
  pos: readonly Pt[],
  edges: readonly Edge[],
): Crossing[] {
  const out: Crossing[] = [];
  const mine = edgesAt(bead, edges);
  for (const i of mine) {
    const e = edges[i]!;
    const a = pos[e[0]]!;
    const b = pos[e[1]]!;
    for (let j = 0; j < edges.length; j++) {
      const f = edges[j]!;
      // A pair where both edges touch the bead shares that bead, so it never crosses.
      // Guard on index order anyway so each pair is reported once, with i < j.
      if (j === i || sharesBead(e, f)) continue;
      if (f[0] === bead || f[1] === bead) continue;
      const p = intersection(a, b, pos[f[0]]!, pos[f[1]]!);
      if (p) out.push(i < j ? { i, j, x: p[0], y: p[1] } : { i: j, j: i, x: p[0], y: p[1] });
    }
  }
  return out;
}
