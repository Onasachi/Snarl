/**
 * Haptics are decorative. iOS Safari has no navigator.vibrate at all, so every moment
 * that buzzes must also land through sound or motion — never through the buzz alone.
 */
export const buzz = (ms: number): void => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Some browsers throw rather than no-op when the gesture requirement is unmet.
  }
};

export const HAPTIC = {
  /** Bead picked up, creature tapped. */
  tap: 8,
  /** A crossing resolved. */
  resolve: 10,
  /** The creature comes free. */
  free: 30,
  /** G$ claimed. */
  claim: 20,
} as const;
