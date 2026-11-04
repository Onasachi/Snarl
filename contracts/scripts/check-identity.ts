import { ethers } from "hardhat";

/**
 * What GoodDollar actually says about an address, everywhere it could be saying it.
 *
 *   ADDRESS=0x… pnpm hardhat run scripts/check-identity.ts --network celo
 *
 * For when somebody reports that the app does not recognise their verified wallet. There
 * are only a few ways that happens and this tells them apart in one read:
 *
 *   - they are verified, and the app has a bug;
 *   - they are verified against a *different* registry — GoodDollar runs production,
 *     staging and development as three separate identity contracts on Celo mainnet, and
 *     a person on one is a stranger to the others;
 *   - their verification has lapsed, because the re-verification ladder starts at three
 *     days for a newcomer and cycles back there afterwards;
 *   - a second wallet of theirs holds the identity, and this one hangs off it;
 *   - they have never verified.
 */
const REGISTRIES = {
  "celo/production": { rpc: "https://forno.celo.org", at: "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42" },
  "celo/staging": { rpc: "https://forno.celo.org", at: "0x0108BBc09772973aC27983Fc17c7D82D8e87ef4D" },
  "celo/development": { rpc: "https://forno.celo.org", at: "0xF25fA0D4896271228193E782831F6f3CFCcF169C" },
  "fuse/production": { rpc: "https://rpc.fuse.io", at: "0x2F9C28de9e6d44b71B91b8BA337A5D82e308E7BE" },
};

const ABI = [
  "function isWhitelisted(address) view returns (bool)",
  "function getWhitelistedRoot(address) view returns (address)",
  "function lastAuthenticated(address) view returns (uint256)",
  "function connectedAccounts(address) view returns (address)",
];

async function main() {
  const address = process.env.ADDRESS;
  if (!address || !ethers.isAddress(address)) throw new Error("set ADDRESS=0x…");
  const who = ethers.getAddress(address);
  console.log(`${who}\n`);

  for (const [name, where] of Object.entries(REGISTRIES)) {
    const provider = new ethers.JsonRpcProvider(where.rpc, undefined, { staticNetwork: true });
    const identity = new ethers.Contract(where.at, ABI, provider);
    try {
      const [whitelisted, root, last, connected] = await Promise.all([
        identity.isWhitelisted(who),
        identity.getWhitelistedRoot(who),
        identity.lastAuthenticated(who).catch(() => 0n),
        identity.connectedAccounts(who).catch(() => ethers.ZeroAddress),
      ]);

      const seen = Number(last) ? new Date(Number(last) * 1000).toISOString().slice(0, 10) : "never";
      const verdict = whitelisted
        ? root === who
          ? "verified"
          : `verified, through ${root}`
        : Number(last)
          ? "LAPSED — GoodDollar wants another look"
          : connected !== ethers.ZeroAddress
            ? `not here; linked to ${connected}`
            : "no record";

      console.log(`  ${name.padEnd(20)} ${verdict}`);
      console.log(`  ${"".padEnd(20)} last verified ${seen}`);
    } catch (error) {
      console.log(`  ${name.padEnd(20)} could not read: ${(error as Error).message.slice(0, 60)}`);
    }
  }

  console.log("\nsnarl reads celo/production unless VITE_GOODDOLLAR_ENV says otherwise.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
