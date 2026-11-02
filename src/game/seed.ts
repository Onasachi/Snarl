/**
 * FNV-1a over a string. Shared by the Daily Snarl and the weekly knot, so a date or a
 * week always means the same tangle everywhere, including on a server checking a solve.
 *
 * This is a wire format. Changing it changes everyone's puzzle.
 */
export function seedFromString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // Keep it a safe positive integer: the scrambler multiplies the seed.
  return (hash >>> 0) % 1_000_000;
}
