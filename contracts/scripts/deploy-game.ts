import { ethers } from "hardhat";
const TOKEN = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";

async function main() {
  const treasury = process.env.GAME_TREASURY;
  if (!treasury || !ethers.isAddress(treasury) || treasury === ethers.ZeroAddress)
    throw new Error("Set GAME_TREASURY: this address permanently receives G$ supply payments.");
  if ((await ethers.provider.getNetwork()).chainId !== 42220n) throw new Error("Use Celo or a Celo fork.");
  if (await ethers.provider.getCode(TOKEN) === "0x") throw new Error("G$ token is missing");
  const token = new ethers.Contract(TOKEN, ["function decimals() view returns (uint8)"], ethers.provider);
  if (await token.decimals() !== 18n) throw new Error("Unexpected token decimals");
  const [signer] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("SnarlGame", signer ?? ethers.Wallet.createRandom());
  const transaction = await factory.getDeployTransaction(TOKEN, treasury);
  const gas = await ethers.provider.estimateGas({ ...transaction, from: signer?.address ?? treasury });
  const fees = await ethers.provider.getFeeData();
  console.log({ token: TOKEN, treasury, gas: gas.toString(), estimatedMaxCelo: fees.maxFeePerGas ? ethers.formatEther(gas * fees.maxFeePerGas) : "unavailable" });
  if (process.env.DEPLOY_GAME !== "yes") { console.log("Preflight only. DEPLOY_GAME=yes broadcasts the deployment."); return; }
  if (!signer) throw new Error("No deployment signer configured");
  const game = await factory.deploy(TOKEN, treasury);
  await game.waitForDeployment();
  console.log(`VITE_SNARL_GAME=${await game.getAddress()}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
