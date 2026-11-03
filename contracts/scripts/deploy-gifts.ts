import { ethers, network } from "hardhat";

/**
 * The gift escrow. It takes one argument and has no owner: nobody can pause it, sweep it
 * or change it after this, which is the point of an escrow.
 *
 *   PRIVATE_KEY=… pnpm hardhat run scripts/deploy-gifts.ts --network celo
 */
const CELO_G$ = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";

async function main() {
  const g$ = process.env.G_DOLLAR ?? CELO_G$;
  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("no signer — set PRIVATE_KEY");

  if ((await ethers.provider.getCode(g$)) === "0x") {
    throw new Error(`no contract at G$ ${g$} on ${network.name}`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`network   ${network.name}`);
  console.log(`deployer  ${deployer.address}  (${ethers.formatEther(balance)} CELO)`);
  console.log(`G$        ${g$}`);
  console.log("owner     none — this contract has no privileged address at all");

  const gifts = await (await ethers.getContractFactory("SnarlGifts")).deploy(g$);
  await gifts.waitForDeployment();
  const address = await gifts.getAddress();

  console.log(`\nSnarlGifts deployed at ${address}`);
  console.log(`\nNext:\n  VITE_SNARL_GIFTS=${address}    in the app's environment`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
