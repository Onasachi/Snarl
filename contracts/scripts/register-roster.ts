import { ethers, network } from "hardhat";
import roster from "../test/fixtures/roster.json";

/**
 * Puts the game's creatures on the board, so a proof is checked against the shape snarl
 * actually ships rather than one the sender made up.
 *
 *   BOARD=0x… pnpm hardhat run scripts/register-roster.ts --network celo
 *
 * Safe to run again: anything already registered is skipped. Nothing is ever changed —
 * `addCreature` refuses to overwrite, which is the point.
 */
async function main() {
  const address = process.env.BOARD;
  if (!address) throw new Error("set BOARD=<address>");

  const [signer] = await ethers.getSigners();
  if (!signer) throw new Error("no signer — set PRIVATE_KEY");
  const board = await ethers.getContractAt("SnarlBoard", address, signer);

  const owner = await board.owner();
  if (owner !== signer.address) {
    throw new Error(`${address} is owned by ${owner}, and you are ${signer.address}`);
  }

  console.log(`network   ${network.name}`);
  console.log(`board     ${address}`);

  let added = 0;
  for (const creature of roster.creatures) {
    const already = await board.creature(creature.id);
    if (already.edges !== "0x") {
      const same = already.edges === creature.edges && Number(already.beads) === creature.beads;
      console.log(
        `  ${String(creature.id).padStart(2)} ${creature.slug.padEnd(10)} ${
          same ? "already registered" : "! REGISTERED AS SOMETHING ELSE — leave it alone"
        }`,
      );
      continue;
    }

    const tx = await board.addCreature(creature.id, creature.edges, creature.beads);
    await tx.wait();
    added += 1;
    console.log(
      `  ${String(creature.id).padStart(2)} ${creature.slug.padEnd(10)} registered (${creature.beads} beads)`,
    );
  }

  console.log(`\n${added} added, roster size now ${await board.rosterSize()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
