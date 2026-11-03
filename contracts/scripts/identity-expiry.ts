import { ethers, network } from "hardhat";

/**
 * What GoodDollar's identity registry actually promises about how long a person stays
 * verified. Run against a Celo fork: `FORK=1 hardhat run scripts/identity-expiry.ts`.
 *
 * It matters because the week's pool opens on Monday and pays out after Sunday, and the
 * registry's re-verification ladder starts far shorter than a week.
 */
const IDENTITY = "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42";
const PEOPLE = [
  "0x43463Ca154eb17EBB6D3A2311d902111E9778D29",
  "0xF0DBC052874bb483fE29549F8A137f13982e0FE7",
  "0xC502922E169A0d85DC803A71f47740975FD106F3",
];

async function main() {
  await network.provider.send("evm_mine", []);
  const id = new ethers.Contract(
    IDENTITY,
    [
      "function isWhitelisted(address) view returns (bool)",
      "function authenticationPeriod() view returns (uint256)",
      "function reverifyDaysOptions(uint256) view returns (uint32)",
      "function shouldReverify(address,uint256) view returns (bool)",
      "function identities(address) view returns (uint256 dateAuthenticated, uint256 dateAdded, string did, uint256 whitelistedOnChainId, uint8 status, uint32 authCount)",
    ],
    ethers.provider,
  );

  const ladder: number[] = [];
  for (let i = 0; i < 16; i++) {
    try {
      ladder.push(Number(await id.reverifyDaysOptions(i)));
    } catch {
      break;
    }
  }
  console.log("reverifyDaysOptions (days):", ladder.join(", "));
  console.log("authenticationPeriod() reports:", (await id.authenticationPeriod()).toString());

  const now = (await ethers.provider.getBlock("latest"))!.timestamp;
  for (const account of PEOPLE) {
    const rec = await id.identities(account);
    const authCount = Number(rec.authCount);
    const since = (now - Number(rec.dateAuthenticated)) / 86400;
    const window = ladder[authCount];
    console.log(
      account,
      "| authCount", authCount,
      "| verified", since.toFixed(2), "days ago",
      "| must reverify after", window, "day(s)",
      "| whitelisted now", await id.isWhitelisted(account),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
