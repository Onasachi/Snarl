/** Reproducible story layouts. Their frontend-checked results can be recorded on Celo. */
import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (specifier.startsWith(".")) return next(`${specifier}.ts`, context);
    throw error;
  }
} });
const { CREATURES } = await import("../src/data/creatures.ts");
const { scramble } = await import("../src/engine/scramble.ts");
const { crossings } = await import("../src/engine/geometry.ts");
const { exactCrossings, toChainPositions } = await import("../src/engine/exact.ts");
const levels = [];
for (let id = 1; id <= 100; id++) {
  const chapter = Math.floor((id - 1) / 20);
  const step = (id - 1) % 20;
  const recovery = step % 5 === 0;
  const creatureIndex = recovery ? chapter % 3 : Math.min(9, Math.floor(step / 5) + chapter + (step % 2));
  const base = CREATURES[creatureIndex];
  const target = recovery ? 2 + chapter : 3 + chapter * 2 + (step % 5);
  const creature = { ...base, target: [target, target + 1] };
  let chosen;
  for (let attempt = 0; attempt < 60; attempt++) {
    const seed = id * 1009 + attempt * 7919;
    const positions = scramble(creature, seed, 12);
    if (!positions) continue;
    const count = crossings(positions, creature.edges).length;
    const { xs, ys } = toChainPositions(positions);
    if (count < target || count > target + 1 || exactCrossings(xs, ys, creature.edges) !== count) continue;
    chosen = { id, creature: base.id, seed, initialCrossings: count, par: Math.max(3, Math.ceil(count * 0.7) + chapter + 1), recovery, positions };
    break;
  }
  if (!chosen) throw new Error(`Cannot generate level ${id} within its difficulty band`);
  levels.push(chosen);
}
const path = resolve("src/data/adventure-levels.json");
writeFileSync(path, `${JSON.stringify(levels, null, 2)}\n`);
console.log(`Generated ${levels.length} bounded, solvable levels: ${path}`);
