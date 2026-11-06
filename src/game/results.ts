import { encodeAbiParameters, keccak256, stringToHex } from "viem";
import { type Creature, crossings, exactCrossings, type Pt, toChainPositions } from "~/engine";
import type { Address } from "~/wallet/port";

export interface GameRun {
  id: Address;
  level: number;
  crossings: number;
  moves: number;
  par: number;
  assisted: boolean;
  solutionHash: Address;
}
export const runId = (key: string): Address => keccak256(stringToHex(`snarl:v1:${key}`));
export const runPoints = (
  initialCrossings: number,
  moves: number,
  par: number,
  assisted: boolean,
) => initialCrossings * 10 + (!assisted && moves <= par ? 25 : 0);
export function gameRun(
  key: string,
  level: number,
  creature: Creature,
  solution: readonly Pt[],
  initialCrossings: number,
  moves: number,
  assisted: boolean,
): GameRun {
  if (
    solution.length !== creature.nodes.length ||
    solution.some((point) =>
      point.some((value) => !Number.isFinite(value) || value < 0 || value > 100),
    ) ||
    crossings(solution, creature.edges).length !== 0
  )
    throw new Error("The puzzle must be untangled before recording it.");
  const { xs, ys } = toChainPositions(solution);
  if (exactCrossings(xs, ys, creature.edges) !== 0)
    throw new Error("The puzzle must be untangled before recording it.");
  return {
    id: runId(key),
    level,
    crossings: initialCrossings,
    moves,
    par: creature.par,
    assisted,
    solutionHash: keccak256(
      encodeAbiParameters([{ type: "int256[]" }, { type: "int256[]" }], [xs, ys]),
    ),
  };
}
