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
    bg: "#0d1527",
    bg2: "#152039",
    water: "#0f1d38",
    card: "rgba(232,237,246,0.07)",
    cardLine: "rgba(232,237,246,0.12)",
    ink: "#e8edf6",
    ink2: "#97a5c3",
    tangled: "#58678b",
    string: "#7290bd",
    warm: "oklch(0.80 0.15 65)",
    eye: "#0d1527",
    moon: "#f3ecd0",
    l: 0.8,
    c: 0.13,
    tintL: 0.91,
    tintC: 0.05,
  },
  paper: {
    id: "paper",
    name: "Paper",
    bg: "#f3efe6",
    bg2: "#fbf8f2",
    water: "#e8e1d2",
    card: "rgba(28,35,51,0.05)",
    cardLine: "rgba(28,35,51,0.12)",
    ink: "#1c2333",
    ink2: "#5b6476",
    tangled: "#9ea6b8",
    string: "#8291b0",
    // Darker than the brand doc's 0.68: on cream that only reached 2.6:1, which fails
    // even the large-text threshold, and the crossing counter is drawn in it.
    warm: "oklch(0.55 0.16 55)",
    eye: "#1c2333",
    moon: "#cdb978",
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
