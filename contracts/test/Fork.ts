import { loadFixture, setBalance, time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import glint from "./fixtures/glint.json";
import reserved from "./fixtures/reserved.json";
import roster from "./fixtures/roster.json";

/**
 * The dress rehearsal, against the real thing.
 *
 * GoodDollar has no testnet: Alfajores is retired and Celo Sepolia holds none of its
 * contracts, so there is nowhere to deploy a practice copy that still knows who is a
 * verified person. What there is, is a local fork of Celo itself — the real G$ token, the
 * real identity registry, real verified humans — which costs nothing and can be thrown
 * away. Everything below runs against addresses that exist on mainnet right now.
 *
 * Run with `pnpm test:fork`. Skipped otherwise, so the normal suite stays offline.
 */
const CELO = {
  g$: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  identity: "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42",
  /** Holds ~88M G$ to hand out as UBI. On a fork it is the most convenient faucet. */
  ubi: "0x43d72Ff17701B2DA814620735C39C620Ce0ea4A1",
};

/**
 * Real accounts, found by reading UBIClaimed out of the UBI scheme at the pinned block.
 * The first three are verified people whose identity root is themselves. The last one
 * claimed UBI in the same window and yet has no root: GoodDollar's whitelisting expires,
 * so "has claimed" and "is verified" are not the same question. The contract asks the
 * second one.
 */
const VERIFIED = [
  "0x43463Ca154eb17EBB6D3A2311d902111E9778D29",
  "0xF0DBC052874bb483fE29549F8A137f13982e0FE7",
  "0xC502922E169A0d85DC803A71f47740975FD106F3",
];
const NOT_VERIFIED = "0xD3D949000AA6260f536E6960b921A12254FB625B";

const WEEK = 202645;
const NEXT = 202646;
const POOL = ethers.parseEther("120000");

const identityAbi = [
  "function isWhitelisted(address) view returns (bool)",
  "function getWhitelistedRoot(address) view returns (address)",
];
const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address,uint256) returns (bool)",
  "function approve(address,uint256) returns (bool)",
];

async function human(address: string) {
  await setBalance(address, ethers.parseEther("10000"));
  return ethers.getImpersonatedSigner(address);
}

async function setup() {
  const [deployer] = await ethers.getSigners();
  const g$ = new ethers.Contract(CELO.g$, erc20Abi, deployer);
  const identity = new ethers.Contract(CELO.identity, identityAbi, deployer);

  const weekly = await (
    await ethers.getContractFactory("SnarlWeekly")
  ).deploy(CELO.g$, CELO.identity, deployer.address);
  await weekly.waitForDeployment();

  // The pool's money comes from the UBI scheme, because on a fork it is simply there.
  const faucet = await human(CELO.ubi);
  await (g$.connect(faucet) as any).transfer(deployer.address, POOL);
  await g$.approve(await weekly.getAddress(), POOL);

  const closesAt = (await time.latest()) + 7 * 24 * 3600;
  const sweepableAt = closesAt + 7 * 24 * 3600;
  return { deployer, g$, identity, weekly, closesAt, sweepableAt };
}

const forked = Boolean(process.env.FORK);

(forked ? describe : describe.skip)("SnarlWeekly on a Celo fork", () => {
  before(async () => {
    // Hardhat treats the fork block itself as history it has no hardfork rules for, so
    // one local block is mined before anything reads state.
    await network.provider.send("evm_mine", []);
  });

  it("is forked from Celo, with GoodDollar's own contracts present", async () => {
    expect((await ethers.provider.getNetwork()).chainId).to.equal(42220n);
    for (const address of Object.values(CELO)) {
      expect(await ethers.provider.getCode(address), address).to.not.equal("0x");
    }
    const g$ = new ethers.Contract(CELO.g$, erc20Abi, ethers.provider);
    expect(await g$.decimals()).to.equal(18n);
  });

  it("reads real people out of the real identity registry", async () => {
    const identity = new ethers.Contract(CELO.identity, identityAbi, ethers.provider);
    for (const address of VERIFIED) {
      expect(await identity.isWhitelisted(address), address).to.equal(true);
      expect(await identity.getWhitelistedRoot(address)).to.equal(address);
    }
    // Claimed UBI at this block, and still has no root.
    expect(await identity.getWhitelistedRoot(NOT_VERIFIED)).to.equal(ethers.ZeroAddress);
  });

  it("funds a week in real G$, and the pool is exactly what arrived", async () => {
    const { weekly, g$, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);

    // G$ is a token with a transfer-fee mechanism in its lineage. If it ever charged one,
    // the contract would be promising more than it holds. It must not be able to drift.
    expect(await g$.balanceOf(await weekly.getAddress())).to.equal(POOL);
    expect((await weekly.knot(WEEK)).pool).to.equal(POOL);
    expect(await weekly.locked()).to.equal(POOL);
  });

  it("lets three verified humans enter with Glint's real shape, and reports the gas", async () => {
    const { weekly, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);

    let worst = 0n;
    for (const address of VERIFIED) {
      const signer = await human(address);
      const tx = await (weekly.connect(signer) as any).enter(
        WEEK,
        glint.solved.xs,
        glint.solved.ys,
      );
      const receipt = await tx.wait();
      worst = receipt.gasUsed > worst ? receipt.gasUsed : worst;
      expect(await weekly.entered(WEEK, address)).to.equal(true);
    }

    expect((await weekly.knot(WEEK)).entrants).to.equal(3);
    console.log(`        enter() gas: ${worst} for ${glint.beads} beads, 15 strings`);
    expect(worst).to.be.lessThan(1_000_000n);
  });

  it("turns away a real address that is not a verified person", async () => {
    const { weekly, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);

    const signer = await human(NOT_VERIFIED);
    await expect(
      (weekly.connect(signer) as any).enter(WEEK, glint.solved.xs, glint.solved.ys),
    ).to.be.revertedWithCustomError(weekly, "NotVerified");
  });

  it("turns away a drawing that is still tangled", async () => {
    const { weekly, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);

    // Swap two arms of the starfish across the body: same creature, crossed strings.
    const xs = [...glint.solved.xs];
    const ys = [...glint.solved.ys];
    [xs[10], xs[12]] = [xs[12] as string, xs[10] as string];
    [ys[10], ys[12]] = [ys[12] as string, ys[10] as string];

    const signer = await human(VERIFIED[0] as string);
    await expect((weekly.connect(signer) as any).enter(WEEK, xs, ys)).to.be.revertedWithCustomError(
      weekly,
      "StillTangled",
    );
  });

  it("pays three real wallets in real G$ when the week closes", async () => {
    const { weekly, g$, identity, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);

    const signers = [];
    for (const address of VERIFIED) {
      const signer = await human(address);
      signers.push(signer);
      await (weekly.connect(signer) as any).enter(WEEK, glint.solved.xs, glint.solved.ys);
    }

    await time.increaseTo(closesAt + 1);
    await weekly.settle(WEEK);

    // A week has passed in fork time, and the registry has changed its mind about all
    // three of them: `reverifyDaysOptions` on Celo starts at three days, and every one
    // of these accounts is on that first rung. This is the week the contract has to
    // survive, and the reason collecting does not ask the registry again.
    for (const address of VERIFIED) {
      expect(await identity.isWhitelisted(address), address).to.equal(false);
      expect(await identity.getWhitelistedRoot(address)).to.equal(ethers.ZeroAddress);
    }
    const share = (await weekly.knot(WEEK)).share;
    expect(share).to.equal(POOL / 3n);

    for (const signer of signers) {
      const before = await g$.balanceOf(signer.address);
      await (weekly.connect(signer) as any).collect(WEEK);
      expect(await g$.balanceOf(signer.address)).to.equal(before + share);
    }

    // What rounding left behind is still the contract's, and still accounted for.
    expect(await g$.balanceOf(await weekly.getAddress())).to.equal(POOL - share * 3n);
    expect(await weekly.locked()).to.equal(POOL - share * 3n);
  });

  it("rolls a share nobody came for into the next week", async () => {
    const { weekly, g$, closesAt, sweepableAt } = await loadFixture(setup);
    await weekly.openKnot(WEEK, glint.edges, glint.beads, closesAt, sweepableAt, POOL);
    await weekly.openKnot(NEXT, glint.edges, glint.beads, sweepableAt + 1, sweepableAt + 2, 0);

    const [first, second] = [
      await human(VERIFIED[0] as string),
      await human(VERIFIED[1] as string),
    ];
    for (const signer of [first, second]) {
      await (weekly.connect(signer) as any).enter(WEEK, glint.solved.xs, glint.solved.ys);
    }

    await time.increaseTo(closesAt + 1);
    await weekly.settle(WEEK);
    const share = (await weekly.knot(WEEK)).share;
    await (weekly.connect(first) as any).collect(WEEK);

    // The second person never came back. Their share had until `sweepableAt`.
    await time.increaseTo(sweepableAt + 1);
    await weekly.sweep(WEEK, NEXT);

    expect((await weekly.knot(NEXT)).pool).to.equal(POOL - share);
    expect(await weekly.locked()).to.equal(POOL - share);
    expect(await g$.balanceOf(await weekly.getAddress())).to.equal(POOL - share);
    await expect(
      (weekly.connect(second) as any).collect(WEEK),
    ).to.be.revertedWithCustomError(weekly, "NothingToCollect");
  });

  describe("gifts", () => {
    const TIP = ethers.parseEther("500");
    const WINDOW = 30 * 24 * 3600;

    async function gifted() {
      const [bystander] = await ethers.getSigners();
      if (!bystander) throw new Error("no signers");
      const gifts = await (await ethers.getContractFactory("SnarlGifts")).deploy(CELO.g$);
      await gifts.waitForDeployment();

      // A sender with no history on Celo. It matters: G$ balances are not static for
      // every account on this chain — see "accrues nothing of its own" below — and
      // Hardhat's own first account turns out to be one of the accounts that accrue.
      const sender = await human(ethers.Wallet.createRandom().address);
      const g$ = new ethers.Contract(CELO.g$, erc20Abi, sender);

      const faucet = await human(CELO.ubi);
      await (new ethers.Contract(CELO.g$, erc20Abi, faucet) as any).transfer(sender.address, TIP);
      await g$.approve(await gifts.getAddress(), TIP);

      return { sender, bystander, g$, gifts, link: ethers.Wallet.createRandom() };
    }

    const signFor = async (gifts: { getAddress(): Promise<string> }, link: ethers.HDNodeWallet, to: string) =>
      link.signMessage(
        ethers.getBytes(
          ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(
              ["string", "uint256", "address", "address", "address"],
              ["snarl gift", 42220, await gifts.getAddress(), link.address, to],
            ),
          ),
        ),
      );

    it("carries real G$ behind a link, and holds exactly what arrived", async () => {
      const { sender, g$, gifts, link } = await loadFixture(gifted);
      const receipt = await (await gifts.connect(sender).send(link.address, TIP, WINDOW)).wait();
      expect(await g$.balanceOf(await gifts.getAddress())).to.equal(TIP);
      console.log(`        send() gas: ${receipt?.gasUsed}`);
    });

    it("pays a wallet that has never held anything, with somebody else's gas", async () => {
      const { sender, bystander, g$, gifts, link } = await loadFixture(gifted);
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      // A brand new address: no CELO, no stablecoin, nothing to pay a fee with. This is
      // the ordinary case for someone opening their first gift link, and the reason
      // `open` lets anyone submit the signature.
      const newcomer = ethers.Wallet.createRandom().address;
      expect(await ethers.provider.getBalance(newcomer)).to.equal(0n);

      const signature = await signFor(gifts, link, newcomer);
      const receipt = await (
        await gifts.connect(bystander).open(link.address, newcomer, signature)
      ).wait();

      expect(await g$.balanceOf(newcomer)).to.equal(TIP);
      expect(await ethers.provider.getBalance(newcomer)).to.equal(0n);
      console.log(`        open() gas: ${receipt?.gasUsed}`);
    });

    it("cannot be re-aimed by whoever sees the signature first", async () => {
      const { sender, bystander, gifts, link } = await loadFixture(gifted);
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      const signature = await signFor(gifts, link, ethers.Wallet.createRandom().address);
      await expect(
        gifts.connect(bystander).open(link.address, bystander.address, signature),
      ).to.be.revertedWithCustomError(gifts, "WrongKey");
    });

    it("accrues nothing of its own, however long a gift waits", async () => {
      const { sender, g$, gifts, link } = await loadFixture(gifted);
      await gifts.connect(sender).send(link.address, TIP, 365 * 24 * 3600);

      // Some accounts on Celo accrue G$ as time passes: `balanceOf` for them is a
      // function of the clock, not a stored number. A contract holding somebody else's
      // gift for a year must be neither richer nor — far more importantly — poorer for
      // the wait, because it has promised every last unit of it to one address.
      const held = await g$.balanceOf(await gifts.getAddress());
      await time.increase(365 * 24 * 3600);
      expect(await g$.balanceOf(await gifts.getAddress())).to.equal(held);
      expect(held).to.equal(TIP);
    });

    it("goes back to the sender in real G$ if nobody opens it", async () => {
      const { sender, g$, gifts, link } = await loadFixture(gifted);
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      await time.increase(WINDOW + 1);
      await expect(gifts.connect(sender).reclaim(link.address)).to.changeTokenBalance(
        g$,
        sender,
        TIP,
      );
      expect(await g$.balanceOf(await gifts.getAddress())).to.equal(0);
    });
  });

  describe("names and the board", () => {
    // The weekly tests above push the clock a fortnight forward to settle and sweep, and
    // by then GoodDollar wants these accounts to verify again — the three-day rung,
    // exactly as the pool tests prove. Everything here is about who a person is, so it
    // starts from the pinned block rather than from wherever the clock was left.
    before(async () => {
      await network.provider.send("hardhat_reset", [
        {
          forking: {
            jsonRpcUrl: process.env.FORK_RPC ?? "https://forno.celo.org",
            blockNumber: Number(process.env.FORK_BLOCK ?? 81_816_364),
          },
        },
      ]);
      await network.provider.send("evm_mine", []);
    });

    async function boarded() {
      const [owner] = await ethers.getSigners();
      if (!owner) throw new Error("no signers");
      const names = await (
        await ethers.getContractFactory("SnarlNames")
      ).deploy(CELO.identity, reserved.names);
      const board = await (
        await ethers.getContractFactory("SnarlBoard")
      ).deploy(CELO.identity, owner.address);
      await Promise.all([names.waitForDeployment(), board.waitForDeployment()]);

      for (const creature of roster.creatures) {
        await board.addCreature(creature.id, creature.edges, creature.beads);
      }
      return { owner, names, board };
    }

    it("gives real verified people names, keyed to the real registry", async () => {
      const { names } = await boarded();
      const [ada, bob] = [
        await human(VERIFIED[0] as string),
        await human(VERIFIED[1] as string),
      ];

      await names.connect(ada).claim("ada");
      await names.connect(bob).claim("bob");

      expect(await names.nameOf(ada.address)).to.equal("ada");
      expect(await names.rootOf("bob")).to.equal(bob.address);
      expect(await names.namesOf([ada.address, bob.address])).to.deep.equal(["ada", "bob"]);
    });

    it("will not let a real verified person take a name that is not theirs to take", async () => {
      const { names } = await boarded();
      const ada = await human(VERIFIED[0] as string);
      // Nobody can undo this contract, so these have to be impossible rather than
      // reversible. Verified or not, in this ecosystem or any other.
      for (const name of ["gooddollar", "minipay", "celo"]) {
        await expect(names.connect(ada).claim(name), name).to.be.revertedWithCustomError(
          names,
          "NameReserved",
        );
      }
    });

    it("has nothing for a real address the registry does not vouch for", async () => {
      const { names } = await boarded();
      const nobody = await human(NOT_VERIFIED);
      await expect(names.connect(nobody).claim("ghost")).to.be.revertedWithCustomError(
        names,
        "NotVerified",
      );
    });

    it("counts a real person's untangles across the whole roster", async () => {
      const { board } = await boarded();
      const ada = await human(VERIFIED[0] as string);

      for (const creature of roster.creatures) {
        await board.connect(ada).prove(creature.id, creature.solved.xs, creature.solved.ys);
      }

      const record = await board.records(ada.address);
      expect(record.untangles).to.equal(roster.creatures.length);
      expect(record.distinct).to.equal(roster.creatures.length);
      expect(await board.playerCount()).to.equal(1);
    });

    it("puts the whole board in one page, ready to be sorted anywhere", async () => {
      const { board } = await boarded();
      const ada = await human(VERIFIED[0] as string);
      const bob = await human(VERIFIED[1] as string);

      await board.connect(ada).prove(glintId(), glint.solved.xs, glint.solved.ys);
      await board.connect(ada).prove(glintId(), glint.solved.xs, glint.solved.ys);
      await board.connect(bob).prove(glintId(), glint.solved.xs, glint.solved.ys);

      const [roots, found] = await board.page(0, 50);
      expect(roots).to.deep.equal([ada.address, bob.address]);
      expect(found[0]?.untangles).to.equal(2);
      expect(found[0]?.distinct).to.equal(1);
      expect(found[1]?.untangles).to.equal(1);
    });
  });

  after(async () => {
    if (forked) await network.provider.send("hardhat_reset", []);
  });
});

/** Glint's number on the board, taken from the roster rather than written down twice. */
const glintId = (): number => {
  const entry = roster.creatures.find((c) => c.slug === glint.id);
  if (!entry) throw new Error("Glint is not on the roster");
  return entry.id;
};

(forked ? describe : describe.skip)("SnarlTrails on a Celo fork", () => {
  it("sells a trail using real G$, recognises a production identity and pays both recipients", async () => {
    await network.provider.send("evm_mine", []);
    // A fresh local recipient has no pre-existing G$ streams that accrue between reads.
    const treasury = await human(ethers.Wallet.createRandom().address);
    const creator = await human(VERIFIED[0]);
    const buyer = await human(VERIFIED[1]);
    const g$ = new ethers.Contract(CELO.g$, erc20Abi, treasury);
    const market = await (await ethers.getContractFactory("SnarlTrails")).deploy(CELO.g$, CELO.identity, treasury.address);
    const price = ethers.parseEther("60");
    await market.connect(creator).publish("Lilies on Celo", price, 2741, [1,3,6], 1);
    const faucet = await human(CELO.ubi);
    await (g$.connect(faucet) as any).transfer(buyer.address, price);
    await (g$.connect(buyer) as any).approve(await market.getAddress(), price);
    await market.connect(buyer).buy(0,price);
    expect(await market.purchased(buyer.address,0)).to.equal(true);
    expect(await market.verifiedBuyers()).to.equal(1);
    const beforeCreator = await g$.balanceOf(creator.address);
    const beforeTreasury = await g$.balanceOf(treasury.address);
    await market.connect(creator).withdraw(); await market.connect(treasury).withdraw();
    expect(await g$.balanceOf(creator.address)-beforeCreator).to.equal(price*9n/10n);
    expect(await g$.balanceOf(treasury.address)-beforeTreasury).to.equal(price/10n);
    expect(await market.liability()).to.equal(0);
  });
});
