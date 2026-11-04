import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const WEEK = 45;
const NEXT = 46;
const POOL = ethers.parseEther("120000");

/** Bub, four beads in a loop: 0-1, 1-2, 2-3, 3-0. A square is free, a bow tie is not. */
const EDGES = "0x0001010202030300";
const BEADS = 4;
const FREE = { xs: [30, 70, 70, 30], ys: [35, 35, 68, 68] };
const TANGLED = { xs: [24, 76, 76, 24], ys: [30, 72, 30, 72] };

async function setup() {
  const [owner, ada, bob, adaSecondWallet, stranger] = await ethers.getSigners();

  const g$ = await (await ethers.getContractFactory("MockG")).deploy();
  const identity = await (await ethers.getContractFactory("MockIdentity")).deploy();
  const weekly = await (
    await ethers.getContractFactory("SnarlWeekly")
  ).deploy(await g$.getAddress(), await identity.getAddress(), owner.address);

  // Ada and Bob are verified people. Ada has two wallets on one identity.
  await identity.link(ada.address, ada.address);
  await identity.link(adaSecondWallet.address, ada.address);
  await identity.link(bob.address, bob.address);

  await g$.mint(owner.address, POOL * 4n);
  await g$.connect(owner).approve(await weekly.getAddress(), POOL * 4n);

  const closesAt = (await time.latest()) + 7 * 24 * 3600;
  const sweepableAt = closesAt + 7 * 24 * 3600;

  return { owner, ada, bob, adaSecondWallet, stranger, g$, identity, weekly, closesAt, sweepableAt };
}

describe("SnarlWeekly", () => {
  it("opens a week and locks what was put up", async () => {
    const { weekly, g$, closesAt, sweepableAt } = await setup();
    await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);

    const knot = await weekly.knot(WEEK);
    expect(knot.pool).to.equal(POOL);
    expect(knot.beads).to.equal(BEADS);
    expect(await weekly.locked()).to.equal(POOL);
    expect(await g$.balanceOf(await weekly.getAddress())).to.equal(POOL);
  });

  it("lets anyone else add to the pool", async () => {
    const { weekly, g$, ada, closesAt, sweepableAt } = await setup();
    await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, 0);

    await g$.mint(ada.address, 500n);
    await g$.connect(ada).approve(await weekly.getAddress(), 500n);
    await expect(weekly.connect(ada).fund(WEEK, 500n))
      .to.emit(weekly, "KnotFunded")
      .withArgs(WEEK, ada.address, 500n);

    expect((await weekly.knot(WEEK)).pool).to.equal(500n);
  });

  describe("entering", () => {
    it("takes an untangled drawing from a verified person", async () => {
      const { weekly, ada, closesAt, sweepableAt } = await setup();
      await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);

      await expect(weekly.connect(ada).enter(WEEK, FREE.xs, FREE.ys))
        .to.emit(weekly, "Entered")
        .withArgs(WEEK, ada.address, ada.address);
      expect((await weekly.knot(WEEK)).entrants).to.equal(1);
    });

    it("turns away a drawing that still crosses", async () => {
      const { weekly, ada, closesAt, sweepableAt } = await setup();
      await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);

      await expect(weekly.connect(ada).enter(WEEK, TANGLED.xs, TANGLED.ys))
        .to.be.revertedWithCustomError(weekly, "StillTangled")
        .withArgs(1);
    });

    it("turns away anyone GoodDollar has not verified", async () => {
      const { weekly, stranger, closesAt, sweepableAt } = await setup();
      await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);

      await expect(
        weekly.connect(stranger).enter(WEEK, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(weekly, "NotVerified");
    });

    // The whole anti-farming argument rests on this: a second wallet is the same person.
    it("counts one person once, however many wallets they bring", async () => {
      const { weekly, ada, adaSecondWallet, closesAt, sweepableAt } = await setup();
      await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);

      await weekly.connect(ada).enter(WEEK, FREE.xs, FREE.ys);
      await expect(
        weekly.connect(adaSecondWallet).enter(WEEK, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(weekly, "AlreadyEntered");
      expect((await weekly.knot(WEEK)).entrants).to.equal(1);
    });

    it("closes at the end of the week", async () => {
      const { weekly, ada, closesAt, sweepableAt } = await setup();
      await weekly.openKnot(WEEK, EDGES, BEADS, closesAt, sweepableAt, POOL);
      await time.increaseTo(closesAt);

      await expect(
        weekly.connect(ada).enter(WEEK, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(weekly, "KnotClosed");
    });
  });

  describe("settling and collecting", () => {
    const enterBoth = async () => {
      const s = await setup();
      await s.weekly.openKnot(WEEK, EDGES, BEADS, s.closesAt, s.sweepableAt, POOL);
      await s.weekly.connect(s.ada).enter(WEEK, FREE.xs, FREE.ys);
      await s.weekly.connect(s.bob).enter(WEEK, FREE.xs, FREE.ys);
      return s;
    };

    it("will not settle while the week is still running", async () => {
      const s = await enterBoth();
      await expect(s.weekly.settle(WEEK)).to.be.revertedWithCustomError(s.weekly, "KnotOpen");
    });

    it("splits the pool equally, whatever anyone did to earn it", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await expect(s.weekly.settle(WEEK))
        .to.emit(s.weekly, "Settled")
        .withArgs(WEEK, 2, POOL / 2n);
    });

    it("pays a share once and only once", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);

      await expect(s.weekly.connect(s.ada).collect(WEEK)).to.changeTokenBalance(
        s.g$,
        s.ada,
        POOL / 2n,
      );
      await expect(s.weekly.connect(s.ada).collect(WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "NothingToCollect",
      );
      expect(await s.weekly.locked()).to.equal(POOL / 2n);
    });

    it("pays nobody who did not enter", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);

      await expect(
        s.weekly.connect(s.stranger).collect(WEEK),
      ).to.be.revertedWithCustomError(s.weekly, "NotVerified");
    });

    it("still pays someone whose verification lapsed after they entered", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);

      // GoodDollar re-verifies on a ladder whose first rung is three days, and the week
      // is seven. Being asked to show your face again is not the same as never having
      // been a person, and the entry is already on the books.
      await s.identity.link(s.ada.address, ethers.ZeroAddress);
      expect(await s.identity.isWhitelisted(s.ada.address)).to.equal(false);

      await expect(s.weekly.connect(s.ada).collect(WEEK)).to.changeTokenBalance(
        s.g$,
        s.ada,
        POOL / 2n,
      );
    });

    it("still pays a linked wallet whose person is down as an entrant", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);

      // Ada entered from her first wallet; her second one collects, and the registry is
      // what ties the two together.
      await expect(s.weekly.connect(s.adaSecondWallet).collect(WEEK)).to.changeTokenBalance(
        s.g$,
        s.adaSecondWallet,
        POOL / 2n,
      );
      await expect(s.weekly.connect(s.ada).collect(WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "NothingToCollect",
      );
    });

    it("pays nobody who entered nothing, verified or not", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);

      // Verified, and still not an entrant.
      await s.identity.link(s.stranger.address, s.stranger.address);
      await expect(s.weekly.connect(s.stranger).collect(WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "NothingToCollect",
      );
    });

    it("will not pay before the week is settled", async () => {
      const s = await enterBoth();
      await time.increaseTo(s.closesAt);
      await expect(s.weekly.connect(s.ada).collect(WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "NotSettled",
      );
    });
  });

  describe("the tally", () => {
    /** Opens `count` weeks in a row, each a week after the last. */
    async function weeks(s: Awaited<ReturnType<typeof setup>>, count: number) {
      const ids: number[] = [];
      let closesAt = s.closesAt;
      for (let i = 0; i < count; i++) {
        const id = 202600 + i;
        await s.weekly.openKnot(id, EDGES, BEADS, closesAt, closesAt + 7 * 24 * 3600, 0);
        ids.push(id);
        closesAt += 7 * 24 * 3600;
      }
      return ids;
    }

    it("counts the weeks a person has entered, not the wallets they used", async () => {
      const s = await setup();
      const [first, second] = await weeks(s, 2);

      await s.weekly.connect(s.ada).enter(first as number, FREE.xs, FREE.ys);
      await s.weekly.connect(s.adaSecondWallet).enter(second as number, FREE.xs, FREE.ys);

      const ada = await s.weekly.players(s.ada.address);
      expect(ada.weeksEntered).to.equal(2);
      expect(await s.weekly.playerCount()).to.equal(1);
    });

    it("builds a run out of consecutive weeks", async () => {
      const s = await setup();
      const ids = await weeks(s, 4);
      for (const id of ids) await s.weekly.connect(s.ada).enter(id, FREE.xs, FREE.ys);

      const ada = await s.weekly.players(s.ada.address);
      expect(ada.weeksEntered).to.equal(4);
      expect(ada.streak).to.equal(4);
      expect(ada.bestStreak).to.equal(4);
    });

    it("starts the run again after a week off, and remembers the best one", async () => {
      const s = await setup();
      const ids = await weeks(s, 5);
      // Three in a row, skip the fourth, then the fifth.
      for (const id of [ids[0], ids[1], ids[2], ids[4]]) {
        await s.weekly.connect(s.ada).enter(id as number, FREE.xs, FREE.ys);
      }

      const ada = await s.weekly.players(s.ada.address);
      expect(ada.weeksEntered).to.equal(4);
      expect(ada.streak).to.equal(1);
      expect(ada.bestStreak).to.equal(3);
    });

    it("counts runs in weeks opened, so a new year does not break one", async () => {
      const s = await setup();
      // 2026-W52 then 2027-W01: nowhere near consecutive as numbers.
      await s.weekly.openKnot(202652, EDGES, BEADS, s.closesAt, s.sweepableAt, 0);
      await s.weekly.openKnot(
        202701,
        EDGES,
        BEADS,
        s.closesAt + 7 * 24 * 3600,
        s.sweepableAt + 7 * 24 * 3600,
        0,
      );

      await s.weekly.connect(s.ada).enter(202652, FREE.xs, FREE.ys);
      await s.weekly.connect(s.ada).enter(202701, FREE.xs, FREE.ys);
      expect((await s.weekly.players(s.ada.address)).streak).to.equal(2);
    });

    it("hands out a page of everyone, for a board to sort as it likes", async () => {
      const s = await setup();
      const [first] = await weeks(s, 1);
      await s.weekly.connect(s.ada).enter(first as number, FREE.xs, FREE.ys);
      await s.weekly.connect(s.bob).enter(first as number, FREE.xs, FREE.ys);

      const [roots, found] = await s.weekly.page(0, 10);
      expect(roots).to.deep.equal([s.ada.address, s.bob.address]);
      expect(found[0]?.weeksEntered).to.equal(1);

      expect((await s.weekly.page(1, 10))[0]).to.deep.equal([s.bob.address]);
      expect((await s.weekly.page(9, 10))[0]).to.deep.equal([]);
      expect(await s.weekly.playersOf([s.bob.address])).to.have.lengthOf(1);
    });
  });

  describe("sweeping", () => {
    it("rolls what nobody came for into another week, and closes the door behind it", async () => {
      const s = await setup();
      await s.weekly.openKnot(WEEK, EDGES, BEADS, s.closesAt, s.sweepableAt, POOL);
      await s.weekly.openKnot(NEXT, EDGES, BEADS, s.sweepableAt + 1000, s.sweepableAt + 2000, 0);

      await s.weekly.connect(s.ada).enter(WEEK, FREE.xs, FREE.ys);
      await s.weekly.connect(s.bob).enter(WEEK, FREE.xs, FREE.ys);
      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);
      await s.weekly.connect(s.ada).collect(WEEK);

      await expect(s.weekly.sweep(WEEK, NEXT)).to.be.revertedWithCustomError(
        s.weekly,
        "NotSweepableYet",
      );

      await time.increaseTo(s.sweepableAt);
      await expect(s.weekly.sweep(WEEK, NEXT))
        .to.emit(s.weekly, "Swept")
        .withArgs(WEEK, NEXT, POOL / 2n);

      expect((await s.weekly.knot(NEXT)).pool).to.equal(POOL / 2n);
      // Bob left it too late. His share is next week's problem, not this contract's debt.
      await expect(s.weekly.connect(s.bob).collect(WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "NothingToCollect",
      );
    });
  });

  describe("sweeping into the wrong place", () => {
    async function swept() {
      const s = await setup();
      await s.weekly.openKnot(WEEK, EDGES, BEADS, s.closesAt, s.sweepableAt, POOL);
      await s.weekly.openKnot(NEXT, EDGES, BEADS, s.sweepableAt + 1, s.sweepableAt + 2, 0);
      await s.weekly.connect(s.ada).enter(WEEK, FREE.xs, FREE.ys);
      await s.weekly.connect(s.bob).enter(WEEK, FREE.xs, FREE.ys);

      await time.increaseTo(s.closesAt);
      await s.weekly.settle(WEEK);
      await s.weekly.connect(s.ada).collect(WEEK);
      await time.increaseTo(s.sweepableAt + 1);
      return s;
    }

    it("refuses to sweep a week into itself", async () => {
      // `from` and `into` would be one storage slot: the pool comes back whole, every
      // share is zeroed, and Bob's half is locked up with nobody able to reach it.
      const s = await swept();
      await expect(s.weekly.sweep(WEEK, WEEK)).to.be.revertedWithCustomError(
        s.weekly,
        "SameKnot",
      );
      expect((await s.weekly.knot(WEEK)).share).to.equal(POOL / 2n);
      await expect(s.weekly.connect(s.bob).collect(WEEK)).to.changeTokenBalance(
        s.g$,
        s.bob,
        POOL / 2n,
      );
    });

    it("refuses to sweep into a week that has already settled", async () => {
      const s = await swept();
      // NEXT closed and settled with nobody in it, so its share is frozen at zero.
      await time.increaseTo(s.sweepableAt + 2);
      await s.weekly.settle(NEXT);

      await expect(s.weekly.sweep(WEEK, NEXT)).to.be.revertedWithCustomError(
        s.weekly,
        "AlreadySettled",
      );
    });

    it("still sweeps into a week that is open", async () => {
      const s = await swept();
      await expect(s.weekly.sweep(WEEK, NEXT))
        .to.emit(s.weekly, "Swept")
        .withArgs(WEEK, NEXT, POOL / 2n);
    });
  });

  describe("handing it over", () => {
    it("moves ownership only when the new owner takes it", async () => {
      const s = await setup();
      // The owner is going to a multisig one day. A one-step transfer to a mistyped
      // address would be as permanent as everything else here.
      await s.weekly.transferOwnership(s.ada.address);
      expect(await s.weekly.owner()).to.equal(s.owner.address);
      expect(await s.weekly.pendingOwner()).to.equal(s.ada.address);

      await expect(s.weekly.connect(s.bob).acceptOwnership()).to.be.revertedWithCustomError(
        s.weekly,
        "OwnableUnauthorizedAccount",
      );
      await s.weekly.connect(s.ada).acceptOwnership();
      expect(await s.weekly.owner()).to.equal(s.ada.address);
    });

    it("cannot be left with no owner at all", async () => {
      const s = await setup();
      await expect(s.weekly.renounceOwnership()).to.be.revertedWithCustomError(
        s.weekly,
        "OwnershipIsNotRenounceable",
      );
      expect(await s.weekly.owner()).to.equal(s.owner.address);
    });
  });

  describe("custody", () => {
    it("never lets the owner touch what a week is holding", async () => {
      const s = await setup();
      await s.weekly.openKnot(WEEK, EDGES, BEADS, s.closesAt, s.sweepableAt, POOL);

      await expect(
        s.weekly.rescue(s.owner.address, 1n),
      ).to.be.revertedWithCustomError(s.weekly, "NothingSpare");

      // G$ sent straight to the contract was never part of a pool, so it can come back.
      await s.g$.mint(await s.weekly.getAddress(), 777n);
      await expect(s.weekly.rescue(s.owner.address, 777n)).to.changeTokenBalance(
        s.g$,
        s.owner,
        777n,
      );
    });

    it("can be paused, and entering stops", async () => {
      const s = await setup();
      await s.weekly.openKnot(WEEK, EDGES, BEADS, s.closesAt, s.sweepableAt, POOL);
      await s.weekly.pause();
      await expect(
        s.weekly.connect(s.ada).enter(WEEK, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(s.weekly, "EnforcedPause");
    });
  });
});
