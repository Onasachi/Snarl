import { ethers, network } from "hardhat";

/**
 * GoodDollar's own contracts on Celo mainnet. The game's client reads the same addresses
 * out of @goodsdks/citizen-sdk, so the two cannot drift apart.
 */
const CELO = {
  g$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  identity: "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42",
};

async function main() {
  const g$ = process.env.G_DOLLAR ?? CELO.g$;
  const identity = process.env.IDENTITY ?? CELO.identity;
  const [deployer] = await ethers.getSigners();
  const owner = process.env.OWNER ?? deployer.address;

  if (network.name === "celo" && owner === deployer.address) {
    // The owner can open weeks, pause, and sweep. On mainnet that should not be a key
    // sitting in an environment variable.
    console.warn("! Deploying to Celo with the deployer as owner. Pass OWNER=<multisig>.");
  }

  console.log(`network   ${network.name}`);
  console.log(`deployer  ${deployer.address}`);
  console.log(`owner     ${owner}`);
  console.log(`G$        ${g$}`);
  console.log(`identity  ${identity}`);

  const weekly = await (await ethers.getContractFactory("SnarlWeekly")).deploy(g$, identity, owner);
  await weekly.waitForDeployment();

  console.log(`\nSnarlWeekly deployed at ${await weekly.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
