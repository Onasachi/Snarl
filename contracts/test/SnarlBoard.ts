import { expect } from "chai";
import { ethers } from "hardhat";
import roster from "./fixtures/roster.json";

/** Bub, four beads in a loop. A square is free; a bow tie is not. */
const BUB = { id: 1, edges: "0x0001010202030300", beads: 4 };
const FREE = { xs: [30, 70, 70, 30], ys: [35, 35, 68, 68] };
const TANGLED = { xs: [24, 76, 76, 24], ys: [30, 72, 30, 72] };
/** Pip, a triangle. */
const PIP = { id: 2, edges: "0x000101020200", beads: 3 };
const PIP_FREE = { xs: [20, 80, 50], ys: [20, 20, 80] };

async function setup() {
  const [owner, ada, adaSecondWallet, bob, stranger] = await ethers.getSigners();
  const identity = await (await ethers.getContractFactory("MockIdentity")).deploy();
  const board = await (
    await ethers.getContractFactory("SnarlBoard")
  ).deploy(await identity.getAddress(), owner.address);

  await identity.link(ada.address, ada.address);
  await identity.link(adaSecondWallet.address, ada.address);
  await identity.link(bob.address, bob.address);

  await board.addCreature(BUB.id, BUB.edges, BUB.beads);
  await board.addCreature(PIP.id, PIP.edges, PIP.beads);

  return { owner, ada, adaSecondWallet, bob, stranger, identity, board };
}

describe("SnarlBoard", () => {
  describe("the roster", () => {
    it("holds the shapes the game ships, so a player supplies only positions", async () => {
      const { board } = await setup();
      const bub = await board.creature(BUB.id);
      expect(bub.edges).to.equal(BUB.edges);
      expect(bub.beads).to.equal(BUB.beads);
      expect(await board.rosterSize()).to.equal(PIP.id + 1);
    });

    it("cannot be rewritten once a creature is on it", async () => {
      const { board } = await setup();
      await expect(board.addCreature(BUB.id, PIP.edges, PIP.beads)).to.be.revertedWithCustomError(
        board,
        "CreatureExists",
      );
    });

    it("belongs to the owner", async () => {
      const { board, ada } = await setup();
      await expect(
        board.connect(ada).addCreature(9, BUB.edges, BUB.beads),
      ).to.be.revertedWithCustomError(board, "OwnableUnauthorizedAccount");
    });
  });

  describe("proving an untangle", () => {
    it("counts it, and remembers which creature it was", async () => {
      const { board, ada } = await setup();
      await expect(board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys))
        .to.emit(board, "Untangled")
        .withArgs(ada.address, BUB.id, 1, true);

      const record = await board.records(ada.address);
      expect(record.untangles).to.equal(1);
      expect(record.distinct).to.equal(1);
      expect(record.freed).to.equal(1n << BigInt(BUB.id));
      expect(record.lastAt).to.be.greaterThan(0);
    });

    it("counts the second pass at a creature, but not twice as a creature", async () => {
      const { board, ada } = await setup();
      await board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys);
      await expect(board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys))
        .to.emit(board, "Untangled")
        .withArgs(ada.address, BUB.id, 2, false);

      const record = await board.records(ada.address);
      expect(record.untangles).to.equal(2);
      expect(record.distinct).to.equal(1);
    });

    it("adds up across a person's wallets, not per wallet", async () => {
      const { board, ada, adaSecondWallet } = await setup();
      await board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys);
      await board.connect(adaSecondWallet).prove(PIP.id, PIP_FREE.xs, PIP_FREE.ys);

      const record = await board.records(ada.address);
      expect(record.untangles).to.equal(2);
      expect(record.distinct).to.equal(2);
      expect(await board.playerCount()).to.equal(1);
    });

    it("turns away a drawing that still crosses", async () => {
      const { board, ada } = await setup();
      await expect(board.connect(ada).prove(BUB.id, TANGLED.xs, TANGLED.ys))
        .to.be.revertedWithCustomError(board, "StillTangled")
        .withArgs(1);
    });

    it("turns away a creature that is not on the roster", async () => {
      const { board, ada } = await setup();
      await expect(
        board.connect(ada).prove(99, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(board, "NoSuchCreature");
    });

    it("turns away the wrong number of beads", async () => {
      const { board, ada } = await setup();
      await expect(
        board.connect(ada).prove(BUB.id, PIP_FREE.xs, PIP_FREE.ys),
      ).to.be.revertedWithCustomError(board, "BadPositions");
    });

    it("turns away anyone GoodDollar has not verified", async () => {
      const { board, stranger } = await setup();
      await expect(
        board.connect(stranger).prove(BUB.id, FREE.xs, FREE.ys),
      ).to.be.revertedWithCustomError(board, "NotVerified");
    });
  });

  describe("the real roster", () => {
    it("registers every creature in the game and accepts each one's true shape", async () => {
      const { board, ada } = await setup();
      let worst = { gas: 0n, slug: "" };

      for (const creature of roster.creatures) {
        // Ids 1 and 2 are the toy creatures this file's setup already used.
        const id = creature.id + 100;
        await board.addCreature(id, creature.edges, creature.beads);

        const receipt = await (
          await board.connect(ada).prove(id, creature.solved.xs, creature.solved.ys)
        ).wait();
        if ((receipt?.gasUsed ?? 0n) > worst.gas) {
          worst = { gas: receipt?.gasUsed ?? 0n, slug: creature.slug };
        }
        if (process.env.GAS) {
          const strings = (creature.edges.length - 2) / 4;
          console.log(
            `        ${creature.slug.padEnd(10)} ${String(strings).padStart(2)} strings  ${receipt?.gasUsed}`,
          );
        }
      }

      const record = await board.records(ada.address);
      expect(record.untangles).to.equal(roster.creatures.length);
      expect(record.distinct).to.equal(roster.creatures.length);

      console.log(`        prove() gas: ${worst.gas} on ${worst.slug}, the densest knot`);
      expect(worst.gas).to.be.lessThan(1_500_000n);
    });
  });

  describe("the board", () => {
    it("hands out pages in the order people arrived", async () => {
      const { board, ada, bob } = await setup();
      await board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys);
      await board.connect(bob).prove(PIP.id, PIP_FREE.xs, PIP_FREE.ys);

      const [roots, found] = await board.page(0, 10);
      expect(roots).to.deep.equal([ada.address, bob.address]);
      expect(found[0]?.untangles).to.equal(1);
      expect(found[1]?.distinct).to.equal(1);

      expect((await board.page(1, 10))[0]).to.deep.equal([bob.address]);
      expect((await board.page(0, 1))[0]).to.deep.equal([ada.address]);
      expect((await board.page(5, 10))[0]).to.deep.equal([]);
    });

    it("puts a person on it once, however many times they come back", async () => {
      const { board, ada } = await setup();
      await board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys);
      await board.connect(ada).prove(BUB.id, FREE.xs, FREE.ys);
      expect(await board.playerCount()).to.equal(1);
    });
  });
});
