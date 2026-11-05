import type { Address } from "~/wallet/port";
export const PALETTES = [
  { name: "Lagoon", color: "#72c9b0", water: "#123e43", lightWater: "#deefea" },
  { name: "Dusk", color: "#d6a1cd", water: "#382d50", lightWater: "#eee2f2" },
  { name: "Amber", color: "#dfc28b", water: "#423a2d", lightWater: "#f3e8cc" },
] as const;
export interface TrailDraft {
  title: string;
  price: bigint;
  seed: number;
  creatures: readonly [number, number, number];
  palette: number;
}
export interface Trail extends TrailDraft {
  id: number;
  creator: Address;
  root: Address;
  active: boolean;
  owned: boolean;
}
export interface MarketState {
  demo: boolean;
  address: Address | null;
  trails: Trail[];
  count: number;
  credit: bigint;
  sales: bigint;
  buyers: bigint;
  repeatBuyers: bigint;
  verifiedBuyers: bigint;
  creators: bigint;
  volume: bigint;
  creatorRevenue: bigint;
  protocolRevenue: bigint;
}
export interface MarketPort {
  market(offset?: number): Promise<MarketState | null>;
  buyTrail(trail: Trail): Promise<void>;
  publishTrail(draft: TrailDraft): Promise<void>;
  withdrawTrailEarnings(): Promise<void>;
}
export const validDraft = (draft: TrailDraft) =>
  new TextEncoder().encode(draft.title.trim()).length >= 3 &&
  new TextEncoder().encode(draft.title.trim()).length <= 48 &&
  draft.price >= 10n ** 18n &&
  draft.price <= 10000n * 10n ** 18n &&
  Number.isInteger(draft.seed) &&
  draft.seed >= 0 &&
  draft.seed <= 0xffffffff &&
  Number.isInteger(draft.palette) &&
  draft.palette >= 0 &&
  draft.palette < 3 &&
  new Set(draft.creatures).size === 3 &&
  draft.creatures.every((n) => Number.isInteger(n) && n >= 0 && n < 10);
export const trailSeed = (trail: TrailDraft, step: number) => (trail.seed + step * 7919) >>> 0;
