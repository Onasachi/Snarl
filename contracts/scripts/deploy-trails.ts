import { ethers, network } from "hardhat";

// Canonical production contracts, checked in test/Fork.ts against Celo.
const TOKEN = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
const IDENTITY = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
async function main() {
  const treasury = process.env.TRAIL_TREASURY;
  if (!treasury || !ethers.isAddress(treasury) || treasury === ethers.ZeroAddress) {
    throw new Error("Set TRAIL_TREASURY explicitly: it permanently receives 10% of sales.");
  }
  if ((await ethers.provider.getNetwork()).chainId !== 42220n) throw new Error("Use Celo or a local Celo fork.");
  for (const address of [TOKEN, IDENTITY]) {
    if (await ethers.provider.getCode(address) === "0x") throw new Error(`Missing contract: ${address}`);
  }
  const token = new ethers.Contract(TOKEN, ["function decimals() view returns (uint8)"], ethers.provider);
  if (await token.decimals() !== 18n) throw new Error("Unexpected G$ decimals");
  const [deployer] = await ethers.getSigners();
  if (!deployer && process.env.DEPLOY_TRAILS === "yes") throw new Error("No deployment signer configured");
  // getContractFactory needs a signer even for constructing bytecode. A random unconnected
  // signer constructs the transaction in read-only mode; it cannot broadcast anything.
  const factory = await ethers.getContractFactory("SnarlTrails", deployer ?? ethers.Wallet.createRandom());
  const transaction = await factory.getDeployTransaction(TOKEN, IDENTITY, treasury);
  const gas = await ethers.provider.estimateGas({ ...transaction, from: deployer?.address ?? treasury });
  const fees = await ethers.provider.getFeeData();
  console.log({
    network: network.name, token: TOKEN, identity: IDENTITY, treasury,
    deployer: deployer?.address ?? "not configured (preflight only)",
    estimatedGas: gas.toString(), maxFeePerGas: fees.maxFeePerGas?.toString(),
    estimatedMaxCelo: fees.maxFeePerGas ? ethers.formatEther(gas * fees.maxFeePerGas) : "unavailable",
  });
  if (process.env.DEPLOY_TRAILS !== "yes") {
    console.log("Preflight only. Set DEPLOY_TRAILS=yes to deploy these exact constructor values.");
    return;
  }
  const market = await factory.deploy(TOKEN, IDENTITY, treasury);
  await market.waitForDeployment();
  console.log(`VITE_SNARL_TRAILS=${await market.getAddress()}`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
