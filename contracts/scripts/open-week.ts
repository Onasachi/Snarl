import { ethers, network } from "hardhat";
import glint from "../test/fixtures/glint.json";
import weeks from "../test/fixtures/weeks.json";

/**
 * Opens one week of the Great Untangle, with the knot the game is showing that week and
 * whatever the pool starts at.
 *
 *   WEEKLY=0x… WEEK=2026-W45 AMOUNT=120000 hardhat run scripts/open-week.ts --network celo
 *
 * AMOUNT is in G$ and may be left out, in which case the week opens empty and anyone can
 * fund it later. The knot and the week numbering come from the game's own files, so there
 * is nothing here to get wrong by hand.
 */
const G$ = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";

async function main() {
  const weekly = process.env.WEEKLY;
  const label = process.env.WEEK;
  if (!weekly || !label) throw new Error("set WEEKLY=<address> and WEEK=<2026-W45>");

  const week = weeks.weeks.find((w) => w.label === label || String(w.id) === label);
  if (!week) {
    throw new Error(
      `${label} is not in contracts/test/fixtures/weeks.json — run \`node scripts/weeks.mjs\` ` +
        "from the repository root to extend the table, and let the app's tests check it.",
    );
  }

  const amount = ethers.parseEther(process.env.AMOUNT ?? "0");
  const [signer] = await ethers.getSigners();
  const contract = await ethers.getContractAt("SnarlWeekly", weekly, signer);

  // Only the owner can open a week. Finding that out from a revert, after approving a
  // token spend, is a worse way to learn it.
  const owner = await contract.owner();
  if (owner !== signer.address) {
    throw new Error(`${weekly} is owned by ${owner}, and you are ${signer.address}`);
  }

  const already = await contract.knot(week.id);
  if (already.closesAt !== 0n) {
    throw new Error(`${week.label} (${week.id}) is already open — closes ${stamp(already.closesAt)}`);
  }

  console.log(`network     ${network.name}`);
  console.log(`contract    ${weekly}`);
  console.log(`week        ${week.label} → ${week.id}`);
  console.log(`knot        ${glint.name}, ${glint.beads} beads, ${(glint.edges.length - 2) / 4} strings`);
  console.log(`pool        ${ethers.formatEther(amount)} G$`);
  console.log(`closes      ${stamp(week.closesAt)}`);
  console.log(`sweepable   ${stamp(week.sweepableAt)}`);
  console.log(`open by     ${stamp(week.openBy)}  (it is already this week somewhere)`);

  const now = Math.floor(Date.now() / 1000);
  if (now > week.openBy) {
    console.warn("! This week has already begun for some players. They cannot enter until now.");
  }
  if (now >= week.closesAt) throw new Error("that week is over");

  if (amount > 0n) {
    const token = await ethers.getContractAt("IERC20", G$, signer);
    const balance = await token.balanceOf(signer.address);
    if (balance < amount) {
      throw new Error(`have ${ethers.formatEther(balance)} G$, need ${ethers.formatEther(amount)}`);
    }
    console.log("\napproving…");
    await (await token.approve(weekly, amount)).wait();
  }

  console.log("opening…");
  const tx = await contract.openKnot(
    week.id,
    glint.edges,
    glint.beads,
    week.closesAt,
    week.sweepableAt,
    amount,
  );
  const receipt = await tx.wait();
  console.log(`\n${week.label} is open. ${receipt?.hash}`);
}

const stamp = (seconds: bigint | number) =>
  new Date(Number(seconds) * 1000).toISOString().replace(".000Z", "Z");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
