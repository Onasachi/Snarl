/**
 * mulberry32. Seeded and portable on purpose: the same seed has to produce the same
 * tangle on every device, and on the server when it verifies a Daily Snarl.
 * Do not "improve" this function — a different stream is a different puzzle.
 */
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));
