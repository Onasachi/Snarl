import { expect } from "chai";
import { ethers } from "hardhat";

/** Edge list packing: two bytes per string, each a bead index. */
const edges = (pairs: [number, number][]): string =>
  `0x${pairs.map(([a, b]) => a.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0")).join("")}`;

const deploy = async () => {
  const factory = await ethers.getContractFactory("PlanarityHarness");
  return factory.deploy();
};

describe("Planarity", () => {
  // Bub: four beads in a loop. Drawn as a square it is free; drawn with two corners
  // swapped it is the bow tie the game opens with.
  const bub: [number, number][] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

  it("sees no crossing in a square", async () => {
    const p = await deploy();
    expect(await p.crossings(edges(bub), [30, 70, 70, 30], [35, 35, 68, 68])).to.equal(0n);
    expect(await p.isUntangled(edges(bub), [30, 70, 70, 30], [35, 35, 68, 68])).to.equal(true);
  });

  it("sees the one crossing in a bow tie", async () => {
    const p = await deploy();
    // The game's own opening tangle for Bub.
    expect(await p.crossings(edges(bub), [24, 76, 76, 24], [30, 72, 30, 72])).to.equal(1n);
  });

  it("does not count strings that meet at their own bead", async () => {
    const p = await deploy();
    // A fan: every string shares bead 0, pointing every which way.
    const fan: [number, number][] = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ];
    expect(
      await p.crossings(edges(fan), [50, 10, 90, 20, 80], [50, 10, 20, 90, 80]),
    ).to.equal(0n);
  });

  it("does not count a touch at an end, or strings lying along each other", async () => {
    const p = await deploy();
    const two: [number, number][] = [
      [0, 1],
      [2, 3],
    ];
    // c sits exactly on a-b: a touch, not a crossing.
    expect(await p.crossings(edges(two), [0, 10, 5, 20], [0, 10, 5, 0])).to.equal(0n);
    // Collinear and overlapping.
    expect(await p.crossings(edges(two), [0, 10, 2, 8], [0, 0, 0, 0])).to.equal(0n);
  });

  it("counts a plain X once", async () => {
    const p = await deploy();
    const two: [number, number][] = [
      [0, 1],
      [2, 3],
    ];
    expect(await p.crossings(edges(two), [0, 10, 0, 10], [0, 10, 10, 0])).to.equal(1n);
  });

  it("refuses a malformed drawing rather than guessing", async () => {
    const p = await deploy();
    const two: [number, number][] = [
      [0, 1],
      [2, 3],
    ];
    await expect(p.crossings("0x00", [0, 1], [0, 1])).to.be.revertedWithCustomError(
      p,
      "BadEdgeList",
    );
    await expect(p.crossings(edges(two), [0, 1, 2], [0, 1])).to.be.revertedWithCustomError(
      p,
      "BadPositions",
    );
    // An edge naming a bead that is not there.
    await expect(
      p.crossings(edges([[0, 9]]), [0, 1], [0, 1]),
    ).to.be.revertedWithCustomError(p, "BadEdgeList");
    // A bead off the grid.
    await expect(
      p.crossings(edges(two), [0, 10, 0, 2_000_000], [0, 10, 10, 0]),
    ).to.be.revertedWithCustomError(p, "OutOfBounds");
  });

  it("stays affordable on the densest knot in the game", async () => {
    const p = await deploy();
    // Ollie: 24 beads, 29 strings — 406 pairs, the worst case the game can ask for.
    const ollie: [number, number][] = [
      [0, 1], [0, 2], [1, 22], [22, 2], [1, 3], [2, 4], [3, 23], [23, 5], [3, 5], [4, 6],
      [5, 10], [10, 7], [7, 11], [11, 6], [0, 20], [0, 21], [20, 21], [20, 10], [21, 11],
      [5, 8], [8, 9], [10, 12], [12, 13], [11, 14], [14, 15], [6, 16], [16, 17], [7, 18],
      [18, 19],
    ];
    const xs = [50, 34, 66, 24, 76, 28, 72, 50, 18, 10, 40, 60, 34, 28, 66, 72, 82, 90, 50, 50, 40, 60, 50, 12];
    const ys = [30, 16, 16, 32, 32, 52, 52, 56, 66, 84, 58, 58, 74, 90, 74, 90, 66, 84, 74, 92, 42, 42, 6, 46];

    expect(await p.crossings(edges(ollie), xs, ys)).to.equal(0n);
    const gas = await p.crossings.estimateGas(edges(ollie), xs, ys);
    expect(gas, `${gas} gas`).to.be.lessThan(1_500_000n);
  });
});
