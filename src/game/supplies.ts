export const SUPPLIES = [
  {
    id: 0,
    key: "hint",
    name: "Hint bundle",
    units: 5,
    price: 100n * 10n ** 18n,
    icon: "✦",
    detail: "Five pointers to a bead that can help.",
  },
  {
    id: 1,
    key: "guide",
    name: "Helping hand",
    units: 3,
    price: 150n * 10n ** 18n,
    icon: "↗",
    detail: "Three boosts that move a bead and clear crossings.",
  },
  {
    id: 2,
    key: "glimpse",
    name: "Firefly vision",
    units: 3,
    price: 75n * 10n ** 18n,
    icon: "◉",
    detail: "Three glimpses of your creature's untangled shape.",
  },
] as const;
export type Supply = (typeof SUPPLIES)[number]["key"];
export type SupplyCounts = Record<Supply, number>;
export const emptySupplies = (): SupplyCounts => ({ hint: 0, guide: 0, glimpse: 0 });
