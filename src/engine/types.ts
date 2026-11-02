/** A point on the 100 × 100 authoring grid. Mutable: drag rewrites positions in place. */
export type Pt = [number, number];

/** An edge between two bead indices. */
export type Edge = readonly [number, number];

/** Where two strings cross, and which pair of edges made it. */
export interface Crossing {
  /** Index into `edges`. */
  i: number;
  /** Index into `edges`, always greater than `i`. */
  j: number;
  x: number;
  y: number;
}

/** One bead, and somewhere it could go to lose at least one crossing. */
export interface Nudge {
  /** Bead index. */
  i: number;
  to: Pt;
  /** Crossings removed by the move. Zero means "no help found, just a hint". */
  gain: number;
}

export type SoundKind = "bubble" | "chirp" | "click" | "flutter" | "croak" | "hum";
export type MoveKind = "swim" | "bob" | "walk" | "sit";

export interface Creature {
  id: string;
  name: string;
  shape: string;
  /** Hue in oklch; lightness and chroma come from the theme. */
  hue: number;
  /** Overrides the theme's chroma. The rare Moon Moth is deliberately desaturated. */
  chroma?: number;
  lore: string;
  sound: SoundKind;
  move: MoveKind;
  idle?: string;
  tap?: string;
  /** Crossing band the scrambler aims for. */
  target?: readonly [number, number];
  /** Moves a confident player needs. Under par earns a shell. */
  par: number;
  /** The true, planar shape. */
  nodes: readonly Pt[];
  edges: readonly Edge[];
  /** Bead carrying the eyes. */
  eye: number;
  /** A fixed opening tangle, used for the tutorial so everyone sees the same first knot. */
  scrambled?: readonly Pt[];
  rare?: boolean;
}
