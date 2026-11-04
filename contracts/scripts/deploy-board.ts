import { ethers, network } from "hardhat";

/**
 * Names and the board. Two contracts, deployed together because neither is much use
 * without the other: a leaderboard of addresses is a leaderboard nobody reads.
 *
 *   PRIVATE_KEY=… OWNER=<multisig> pnpm hardhat run scripts/deploy-board.ts --network celo
 *
 * The board's owner can only ever add creatures to the roster — never change one, never
 * remove one, never touch a score. SnarlNames has no owner at all.
 */
const CELO_IDENTITY = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";

async function main() {
  const identity = process.env.IDENTITY ?? CELO_IDENTITY;
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("no signer — set PRIVATE_KEY");
  const owner = process.env.OWNER ?? deployer.address;

  if ((await ethers.provider.getCode(identity)) === "0x") {
    throw new Error(`no identity contract at ${identity} on ${network.name}`);
  }

  console.log(`network   ${network.name}`);
  console.log(`deployer  ${deployer.address}`);
  console.log(`identity  ${identity}`);
  console.log(`owner     ${owner}  (roster only)`);

  const names = await (await ethers.getContractFactory("SnarlNames")).deploy(identity);
  await names.waitForDeployment();
  const board = await (await ethers.getContractFactory("SnarlBoard")).deploy(identity, owner);
  await board.waitForDeployment();

  console.log(`\nSnarlNames deployed at ${await names.getAddress()}`);
  console.log(`SnarlBoard deployed at ${await board.getAddress()}`);
  console.log("\nNext:");
  console.log(`  BOARD=${await board.getAddress()} pnpm hardhat run scripts/register-roster.ts --network ${network.name}`);
  console.log(`  VITE_SNARL_NAMES=${await names.getAddress()}`);
  console.log(`  VITE_SNARL_BOARD=${await board.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
