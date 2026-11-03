import type { Edge, Pt } from "./types";

/**
 * The crossing test again, in exact integers — the same rule `Planarity.sol` enforces on
 * chain, down to the sign comparisons.
 *
 * The game's own engine works in floats and needs an epsilon to decide whether two strings
 * really meet. The contract has no epsilon and cannot be argued with, so before offering
 * anyone a transaction the client checks the drawing the contract's way. Better to find a
 * disagreement here than in a revert.
 */

/** Positions are sent as integers on this grid; the game plays on 0–100. */
export const CHAIN_GRID = 1_000_000;
const SCALE = CHAIN_GRID / 100;

/** Grid coordinates to the integers the contract expects, clamped to its bounds. */
export const toChainPositions = (pos: readonly Pt[]): { xs: bigint[]; ys: bigint[] } => {
  const clamp = (v: number) => Math.max(0, Math.min(CHAIN_GRID, Math.round(v * SCALE)));
  return {
    xs: pos.map((p) => BigInt(clamp(p[0]))),
    ys: pos.map((p) => BigInt(clamp(p[1]))),
  };
};

/** Twice the signed area of the triangle abc. Positive if c is left of a→b. */
const orientation = (
  ax: bigint,
  ay: bigint,
  bx: bigint,
  by: bigint,
  cx: bigint,
  cy: bigint,
): bigint => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/** A proper crossing: strictly inside both strings. Touching at an end does not count. */
const crossesAt = (
  xs: readonly bigint[],
  ys: readonly bigint[],
  a: number,
  b: number,
  c: number,
  d: number,
): boolean => {
  const o1 = orientation(xs[a]!, ys[a]!, xs[b]!, ys[b]!, xs[c]!, ys[c]!);
  const o2 = orientation(xs[a]!, ys[a]!, xs[b]!, ys[b]!, xs[d]!, ys[d]!);
  if (o1 === 0n || o2 === 0n || o1 > 0n === o2 > 0n) return false;

  const o3 = orientation(xs[c]!, ys[c]!, xs[d]!, ys[d]!, xs[a]!, ys[a]!);
  const o4 = orientation(xs[c]!, ys[c]!, xs[d]!, ys[d]!, xs[b]!, ys[b]!);
  return o3 !== 0n && o4 !== 0n && o3 > 0n !== o4 > 0n;
};

/** How many crossings the contract would find in this drawing. */
export function exactCrossings(
  xs: readonly bigint[],
  ys: readonly bigint[],
  edges: readonly Edge[],
): number {
  let found = 0;
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i]!;
    for (let j = i + 1; j < edges.length; j++) {
      const [c, d] = edges[j]!;
      if (a === c || a === d || b === c || b === d) continue;
      if (crossesAt(xs, ys, a, b, c, d)) found++;
    }
  }
  return found;
}

/** What the contract would say about this board, before anyone pays gas to hear it. */
export const isUntangledOnChain = (pos: readonly Pt[], edges: readonly Edge[]): boolean => {
  const { xs, ys } = toChainPositions(pos);
  return exactCrossings(xs, ys, edges) === 0;
};

/** The week's edge list, packed as the contract stores it: two bytes per string. */
export const packEdges = (edges: readonly Edge[]): `0x${string}` =>
  `0x${edges.map(([a, b]) => a.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0")).join("")}`;
