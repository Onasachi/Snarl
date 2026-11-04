import { artifacts, ethers, network } from "hardhat";
import glint from "../test/fixtures/glint.json";
import reserved from "../test/fixtures/reserved.json";
import roster from "../test/fixtures/roster.json";

/**
 * Reads a deployed contract back and checks it is what we think it is.
 *
 *   GIFTS=0x… BOARD=0x… NAMES=0x… WEEKLY=0x… \
 *     pnpm hardhat run scripts/check-live.ts --network celo
 *
 * Read-only: no key, no transactions. Every address is optional; it checks what it is
 * given. A deployment that cannot be re-derived from this repository is one nobody should
 * point the app at.
 */
const CELO = {
  g$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  identity: "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42",
};

let failures = 0;

/** Bytecode is thousands of characters and nobody reads it; its ends are enough to tell. */
const brief = (value: unknown) => {
  const text = String(value);
  return text.length > 70 ? `${text.slice(0, 34)}…${text.slice(-24)} (${text.length} chars)` : text;
};

function check(what: string, actual: unknown, expected: unknown) {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  if (!ok) failures += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${what.padEnd(34)} ${brief(actual)}`);
  if (!ok) console.log(`        expected${" ".repeat(26)} ${brief(expected)}`);
}

/**
 * The runtime bytecode this repository compiles to, with the constructor's immutable
 * arguments written into the slots the compiler left for them. If this matches what is on
 * chain, the code there is this source — whatever a block explorer does or does not say.
 *
 * The slot positions come from the build info rather than the artifact, which does not
 * carry them. Each immutable has its own AST id, and AST ids rise with source position,
 * so sorting them puts the slots in declaration order — which is the order the values are
 * given in.
 */
async function expectedRuntime(fullyQualified: string, values: string[]) {
  const [source, name] = fullyQualified.split(":") as [string, string];
  const info = await artifacts.getBuildInfo(fullyQualified);
  if (!info) throw new Error(`no build info for ${fullyQualified}`);

  const compiled = info.output.contracts[source]?.[name]?.evm?.deployedBytecode as
    | { object: string; immutableReferences?: Record<string, { start: number; length: number }[]> }
    | undefined;
  if (!compiled) throw new Error(`no deployed bytecode for ${fullyQualified}`);

  const code = Buffer.from(compiled.object, "hex");
  const byAstId = Object.entries(compiled.immutableReferences ?? {}).sort(
    ([a], [b]) => Number(a) - Number(b),
  );
  if (byAstId.length !== values.length) {
    throw new Error(`${name} has ${byAstId.length} immutables, ${values.length} given`);
  }

  byAstId.forEach(([, slots], i) => {
    const padded = Buffer.from(ethers.zeroPadValue(values[i] as string, 32).slice(2), "hex");
    for (const slot of slots) padded.copy(code, slot.start);
  });
  return `0x${code.toString("hex")}`;
}

async function main() {
  console.log(`network ${network.name}\n`);

  if (process.env.GIFTS) {
    const address = process.env.GIFTS;
    console.log(`SnarlGifts ${address}`);
    const gifts = await ethers.getContractAt("SnarlGifts", address);

    check("has code", (await ethers.provider.getCode(address)) !== "0x", true);
    check("token is G$", await gifts.token(), CELO.g$);
    check("MIN_WINDOW is a day", await gifts.MIN_WINDOW(), 86_400);
    check("MAX_WINDOW is a year", await gifts.MAX_WINDOW(), 365 * 86_400);

    // Nothing else matters if this is wrong: the client signs a digest and the contract
    // rebuilds it, and by the time anyone finds out the money is already escrowed.
    const key = "0x2222222222222222222222222222222222222222";
    const to = "0x3333333333333333333333333333333333333333";
    const inner = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "uint256", "address", "address", "address"],
        ["snarl gift", 42220, address, key, to],
      ),
    );
    check("digest matches the client's", await gifts.digest(key, to), ethers.hashMessage(ethers.getBytes(inner)));

    check(
      "bytecode is this source",
      await ethers.provider.getCode(address),
      await expectedRuntime("contracts/SnarlGifts.sol:SnarlGifts", [CELO.g$]),
    );
    console.log();
  }

  if (process.env.NAMES) {
    const address = process.env.NAMES;
    console.log(`SnarlNames ${address}`);
    const names = await ethers.getContractAt("SnarlNames", address);
    check("identity is GoodDollar's", await names.identity(), CELO.identity);
    check(
      "bytecode is this source",
      await ethers.provider.getCode(address),
      await expectedRuntime("contracts/SnarlNames.sol:SnarlNames", [CELO.identity]),
    );
    console.log(`  --    names claimed                       ${await names.claimed()}`);
    for (const name of reserved.names) {
      check(`reserved: ${name}`, await names.reserved(ethers.keccak256(ethers.toUtf8Bytes(name))), true);
    }
    console.log();
  }

  if (process.env.BOARD) {
    const address = process.env.BOARD;
    console.log(`SnarlBoard ${address}`);
    const board = await ethers.getContractAt("SnarlBoard", address);
    check("identity is GoodDollar's", await board.identity(), CELO.identity);
    check(
      "bytecode is this source",
      await ethers.provider.getCode(address),
      await expectedRuntime("contracts/SnarlBoard.sol:SnarlBoard", [CELO.identity]),
    );
    console.log(`  --    owner                              ${await board.owner()}`);
    for (const creature of roster.creatures) {
      const found = await board.creature(creature.id);
      const registered = found.edges !== "0x";
      check(
        `creature ${String(creature.id).padStart(2)} ${creature.slug}`,
        registered ? `${found.edges}/${found.beads}` : "not registered",
        registered ? `${creature.edges}/${creature.beads}` : "not registered",
      );
    }
    console.log();
  }

  if (process.env.WEEKLY) {
    const address = process.env.WEEKLY;
    console.log(`SnarlWeekly ${address}`);
    const weekly = await ethers.getContractAt("SnarlWeekly", address);
    check("token is G$", await weekly.token(), CELO.g$);
    check("identity is GoodDollar's", await weekly.identity(), CELO.identity);
    check(
      "bytecode is this source",
      await ethers.provider.getCode(address),
      await expectedRuntime("contracts/SnarlWeekly.sol:SnarlWeekly", [CELO.g$, CELO.identity]),
    );
    console.log(`  --    owner                              ${await weekly.owner()}`);
    console.log(`  --    weeks opened                       ${await weekly.weeksOpened()}`);
    console.log(`  --    locked                             ${ethers.formatEther(await weekly.locked())} G$`);

    const week = Number(process.env.WEEK_ID ?? 0);
    if (week) {
      const knot = await weekly.knot(week);
      check(`week ${week} edges are Glint's`, knot.edges, glint.edges);
      check(`week ${week} beads`, knot.beads, glint.beads);
      console.log(`  --    pool                               ${ethers.formatEther(knot.pool)} G$`);
      console.log(`  --    closes                             ${new Date(Number(knot.closesAt) * 1000).toISOString()}`);
    }
    console.log();
  }

  console.log(failures === 0 ? "all checks passed" : `${failures} CHECK(S) FAILED`);
  if (failures) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
