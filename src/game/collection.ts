import { CREATURES } from "~/data";
import type { FreedCreature } from "./store";
export const RESTORATION = [
  { count: 3, name: "Lily pads", detail: "A place to rest" },
  { count: 6, name: "Reed garden", detail: "A little shelter" },
  { count: 10, name: "Lotus bloom", detail: "Your pond comes alive" },
] as const;
export function collection(freed: readonly FreedCreature[]) {
  const known = new Set(freed.map((e) => e.id));
  const world = CREATURES.filter((c) => known.has(c.id)).length;
  const mastered = new Set(freed.filter((e) => !e.gifted && e.underPar).map((e) => e.id));
  const residents = [...new Map(freed.map((e) => [e.id, e])).values()].slice(-10);
  return { known, world, mastered, residents, next: RESTORATION.find((m) => m.count > world) };
}

/** Bought or gifted rescues count too: exploration should seek an unknown neighbour. */
export function nextExplorationIndex(playIndex: number, freed: readonly FreedCreature[]): number {
  if (playIndex >= CREATURES.length) return playIndex;
  const known = new Set(freed.map((e) => e.id));
  for (let i = playIndex; i < CREATURES.length; i++) if (!known.has(CREATURES[i]!.id)) return i;
  return CREATURES.length;
}
