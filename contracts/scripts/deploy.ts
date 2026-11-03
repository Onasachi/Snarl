import { ethers, network } from "hardhat";

/**
 * GoodDollar's own contracts on Celo mainnet. The game's client reads the same addresses
 * out of @goodsdks/citizen-sdk, so the two cannot drift apart.
 *
 * Celo is the only network this can go to. Alfajores has been retired and Celo Sepolia,
 * which replaced it, has no GoodDollar on it — there is no testnet that knows who is a
 * verified person. What stands in for one is a fork of Celo itself: `pnpm test:fork`.
 */
const CELO = {
  g$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  identity: "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42",
};

async function main() {
  const g$ = process.env.G_DOLLAR ?? CELO.g$;
  const identity = process.env.IDENTITY ?? CELO.identity;
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("no signer — set PRIVATE_KEY");
  const owner = process.env.OWNER ?? deployer.address;

  // A typo in either address would deploy a contract that can never pay anybody, and
  // only mainnet has the real ones. Both are cheap to check before spending anything.
  for (const [what, address] of Object.entries({ g$, identity })) {
    if ((await ethers.provider.getCode(address)) === "0x") {
      throw new Error(`no contract at ${what} ${address} on ${network.name}`);
    }
  }

  const live = network.name === "celo" || network.config.chainId === 42220;
  if (live && owner === deployer.address && process.env.I_ACCEPT_SINGLE_KEY_OWNER !== "yes") {
    // The owner opens weeks, pauses, and sweeps what nobody collected. On mainnet that
    // should not be one key in an environment variable. Pass OWNER=<multisig>, or say so
    // out loud with I_ACCEPT_SINGLE_KEY_OWNER=yes.
    throw new Error("refusing to deploy to Celo with the deployer as owner — pass OWNER=<multisig>");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`network   ${network.name}`);
  console.log(`deployer  ${deployer.address}  (${ethers.formatEther(balance)} CELO)`);
  console.log(`owner     ${owner}${owner === deployer.address ? "  ← the deployer itself" : ""}`);
  console.log(`G$        ${g$}`);
  console.log(`identity  ${identity}`);

  const weekly = await (await ethers.getContractFactory("SnarlWeekly")).deploy(g$, identity, owner);
  await weekly.waitForDeployment();
  const address = await weekly.getAddress();

  console.log(`\nSnarlWeekly deployed at ${address}`);
  console.log("\nNext:");
  console.log(`  VITE_SNARL_WEEKLY=${address}    in the app's environment`);
  console.log(`  WEEKLY=${address} WEEK=<2026-W45> AMOUNT=<G$> hardhat run scripts/open-week.ts --network ${network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
