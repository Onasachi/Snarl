import type { Creature } from "~/engine";

export type ThemeId = "night" | "paper";

export interface Theme {
  id: ThemeId;
  name: string;
  bg: string;
  bg2: string;
  water: string;
  card: string;
  cardLine: string;
  ink: string;
  ink2: string;
  /** Growth and primary actions; discovery and daily challenges. */
  accent: string;
  onAccent: string;
  accent2: string;
  growthSurface: string;
  discoverySurface: string;
  /** Beads and strings before the creature is freed. */
  tangled: string;
  string: string;
  /** Crossings only. Never UI chrome. */
  warm: string;
  eye: string;
  moon: string;
  /** Lightness and chroma for a freed creature's signature colour. */
  l: number;
  c: number;
  /** ... and for its lighter string tint. */
  tintL: number;
  tintC: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  night: {
    id: "night",
    name: "Night pond",
    bg: "#111e29",
    bg2: "#1a2b36",
    water: "#15373c",
    card: "rgba(172,210,193,0.07)",
    cardLine: "rgba(172,210,193,0.18)",
    ink: "#edf4eb",
    ink2: "#acc0c4",
    accent: "#9bdfba",
    onAccent: "#153e30",
    accent2: "#d2b6ea",
    growthSurface: "#1b3435",
    discoverySurface: "#2a2b40",
    tangled: "#667b94",
    string: "#8da8b9",
    warm: "oklch(0.80 0.15 65)",
    eye: "#111e29",
    moon: "#f1dfac",
    l: 0.8,
    c: 0.13,
    tintL: 0.91,
    tintC: 0.05,
  },
  paper: {
    id: "paper",
    name: "Paper",
    bg: "#f6f1e7",
    bg2: "#fffaf1",
    water: "#e2eee5",
    card: "rgba(46,104,82,0.05)",
    cardLine: "rgba(46,104,82,0.20)",
    ink: "#253c39",
    ink2: "#526964",
    accent: "#2e6852",
    onAccent: "#fffaf1",
    accent2: "#795590",
    growthSurface: "#e6edde",
    discoverySurface: "#eee5f1",
    tangled: "#80928c",
    string: "#73877f",
    // Darker than the brand doc's 0.68: on cream that only reached 2.6:1, which fails
    // even the large-text threshold, and the crossing counter is drawn in it.
    warm: "oklch(0.55 0.16 55)",
    eye: "#253c39",
    moon: "#a18a49",
    // Likewise 0.68 left a freed creature at 2.3:1 against paper. 0.55 clears 3:1 on
    // every hue in the roster against both the page and the pond's water, which is the
    // darker of the two and so the one that decides it. test/theme.test.ts holds the line.
    l: 0.55,
    c: 0.14,
    tintL: 0.7,
    tintC: 0.09,
  },
};

export const theme = (id: ThemeId | undefined): Theme => THEMES[id ?? "night"];

/** A freed creature's signature colour: its own hue, the theme's lightness and chroma. */
export const creatureColor = (c: Creature, id: ThemeId): string => {
  const t = theme(id);
  return `oklch(${t.l} ${c.chroma ?? t.c} ${c.hue})`;
};

/** The lighter tint its strings turn when it comes free. */
export const creatureTint = (c: Creature, id: ThemeId): string => {
  const t = theme(id);
  return `oklch(${t.tintL} ${t.tintC} ${c.hue})`;
};
