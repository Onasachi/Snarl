import roster from "~/../contracts/test/fixtures/roster.json";

/**
 * Each creature's number on the board.
 *
 * The numbers are the contract's, not the game's: `SnarlBoard.addCreature` is permanent,
 * so once a creature is registered its number is part of everything anybody has proved
 * about it. They live in `contracts/test/fixtures/roster.json`, generated from the game's
 * own data by `scripts/roster.mjs` and checked against it by `test/chain-fixtures.test.ts`.
 */
const BY_SLUG = new Map(roster.creatures.map((creature) => [creature.slug, creature.id]));

export const chainIdOf = (slug: string): number | undefined => BY_SLUG.get(slug);

/** True when this person has already put that creature on the board. */
export const isOnBoard = (freed: bigint, slug: string): boolean => {
  const id = chainIdOf(slug);
  return id === undefined ? false : (freed >> BigInt(id)) & 1n ? true : false;
};
