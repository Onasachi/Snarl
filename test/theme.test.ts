import { describe, expect, it } from "vitest";
import { ALL_CREATURES, creatureColor, creatureTint, THEMES, type ThemeId } from "~/data";

/**
 * WCAG contrast, computed rather than eyeballed. Both palettes are checked, including the
 * oklch colours, so a palette tweak that makes the game unreadable fails here first.
 */

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminanceFromHex = (hex: string): number => {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(clean.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** oklch -> linear sRGB -> relative luminance. */
const luminanceFromOklch = (L: number, C: number, H: number): number => {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const bb = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const b = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const parseOklch = (value: string): [number, number, number] => {
  const [L, C, H] = value
    .replace(/oklch\(|\)/g, "")
    .split(/\s+/)
    .map(Number) as [number, number, number];
  return [L, C, H];
};

const luminance = (color: string): number =>
  color.startsWith("oklch") ? luminanceFromOklch(...parseOklch(color)) : luminanceFromHex(color);

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

const themes: ThemeId[] = ["night", "paper"];

describe.each(themes)("the %s theme", (id) => {
  const t = THEMES[id];

  it.each(["bg", "bg2", "water", "card"] as const)("reads body text on %s", (surface) => {
    // `card` is translucent over the background, so the background is the honest test.
    const behind = surface === "card" ? t.bg : t[surface];
    expect(contrast(t.ink, behind)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink2, behind)).toBeGreaterThanOrEqual(4.5);
  });

  it("reads the filled button's own text", () => {
    expect(contrast(t.bg, t.ink)).toBeGreaterThanOrEqual(4.5);
  });

  // The crossing counter is drawn in the warm accent at 44px/600 — large text, 3:1.
  it("reads the crossing counter", () => {
    expect(contrast(t.warm, t.bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(ALL_CREATURES.map((c) => [c.id, c] as const))(
    "shows %s clearly against the water",
    (_id, creature) => {
      expect(contrast(creatureColor(creature, id), t.water)).toBeGreaterThanOrEqual(3);
      expect(contrast(creatureColor(creature, id), t.bg)).toBeGreaterThanOrEqual(3);
    },
  );

  it("keeps a freed creature's strings visible", () => {
    for (const creature of ALL_CREATURES) {
      expect(contrast(creatureTint(creature, id), t.bg)).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("keeps tangled beads and strings visible", () => {
    expect(contrast(t.tangled, t.bg)).toBeGreaterThanOrEqual(2);
    expect(contrast(t.string, t.bg)).toBeGreaterThanOrEqual(2);
  });
});
