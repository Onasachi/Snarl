import { expect } from "chai";
import { ethers } from "hardhat";

const run = (id = "adventure:1", extra = {}) => ({ id: ethers.id(id), level: 1, crossings: 5, moves: 3, par: 4, assisted: false, solutionHash: ethers.id("solution"), ...extra });
async function setup() {
  const [treasury, player, other] = await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MockG")).deploy();
  const game = await (await ethers.getContractFactory("SnarlGame")).deploy(await token.getAddress(), treasury.address);
  await token.mint(player.address, ethers.parseEther("1000"));
  return { token, game, treasury, player, other };
}
describe("SnarlGame: player-reported results and G$ supplies", () => {
  it("lets an ordinary wallet record a result without GoodDollar verification", async () => {
    const { game, player } = await setup();
    const result = run();
    await expect(game.connect(player).recordRun(result)).to.emit(game, "RunRecorded").withArgs(player.address, result.id, 1, 5, 3, 4, false, 75, result.solutionHash);
    expect(await game.players(player.address)).to.deep.equal([1n, 5n, 75n]);
    expect(await game.runCount()).to.equal(1);
    expect(await game.playerCount()).to.equal(1);
  });
  it("counts a puzzle once per wallet and keeps other wallets independent", async () => {
    const { game, player, other } = await setup();
    await game.connect(player).recordRun(run());
    await expect(game.connect(player).recordRun(run())).to.be.revertedWithCustomError(game, "AlreadyRecorded");
    await game.connect(other).recordRun(run());
    await game.connect(player).recordRun(run("adventure:2", { assisted: true }));
    expect((await game.players(player.address)).points).to.equal(125);
    expect(await game.runCount()).to.equal(3);
    expect(await game.playerCount()).to.equal(2);
  });
  it("records claimed performance rather than pretending to verify a solution hash", async () => {
    const { game, player } = await setup();
    await game.connect(player).recordRun(run("claim", { solutionHash: ethers.id("client-checked-only") }));
    expect(await game.recorded(player.address, ethers.id("claim"))).to.equal(true);
  });
  it("rejects malformed records without changing totals", async () => {
    const { game, player } = await setup();
    for (const extra of [{ id: ethers.ZeroHash }, { solutionHash: ethers.ZeroHash }, { crossings: 0 }, { crossings: 513 }, { par: 0 }, { par: 513 }, { moves: 100001 }]) {
      await expect(game.connect(player).recordRun(run("bad", extra))).to.be.revertedWithCustomError(game, "Invalid");
    }
    expect(await game.runCount()).to.equal(0);
  });
  it("charges exact G$ prices, credits units and exposes purchase totals", async () => {
    const { game, token, player, treasury } = await setup();
    await token.connect(player).approve(await game.getAddress(), ethers.parseEther("325"));
    for (const [item, units, price] of [[0, 5, "100"], [1, 3, "150"], [2, 3, "75"]] as const) {
      await expect(game.connect(player).buy(item)).to.emit(game, "SuppliesPurchased").withArgs(player.address, item, units, ethers.parseEther(price));
      expect(await game.purchasedUnits(player.address, item)).to.equal(units);
    }
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("325"));
    expect(await game.volume()).to.equal(ethers.parseEther("325"));
    expect(await game.sales()).to.equal(3);
    expect(await game.buyers()).to.equal(1);
    expect(await token.balanceOf(await game.getAddress())).to.equal(0);
  });
  it("does not issue supplies for failed payments and rejects unknown items", async () => {
    const { game, player } = await setup();
    await expect(game.connect(player).buy(0)).to.be.reverted;
    await expect(game.connect(player).buy(3)).to.be.revertedWithCustomError(game, "Invalid");
    expect(await game.purchasedUnits(player.address, 0)).to.equal(0);
    expect(await game.sales()).to.equal(0);
    expect(await game.volume()).to.equal(0);
  });
  it("supports repeat purchases and paginates community records", async () => {
    const { game, token, player, other } = await setup();
    await token.connect(player).approve(await game.getAddress(), ethers.parseEther("200"));
    await game.connect(player).buy(0); await game.connect(player).buy(0);
    expect(await game.purchasedUnits(player.address, 0)).to.equal(10);
    expect(await game.buyers()).to.equal(1);
    await game.connect(player).recordRun(run()); await game.connect(other).recordRun(run());
    expect((await game.page(0, 1))[0]).to.deep.equal([player.address]);
    expect((await game.page(1, 100))[0]).to.deep.equal([other.address]);
    expect((await game.page(999, 100))[0]).to.deep.equal([]);
  });
  it("rejects a missing token or treasury and treasury self-purchases", async () => {
    const { game, token, treasury } = await setup();
    const factory = await ethers.getContractFactory("SnarlGame");
    await expect(factory.deploy(ethers.ZeroAddress, treasury.address)).to.be.revertedWithCustomError(game, "Invalid");
    await expect(factory.deploy(await token.getAddress(), ethers.ZeroAddress)).to.be.revertedWithCustomError(game, "Invalid");
    await expect(game.buy(0)).to.be.revertedWithCustomError(game, "Invalid");
  });
  it("blocks reentrant buying and rolls back tokens that short-pay the treasury", async () => {
    const [treasury, player] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("CallbackG")).deploy();
    const game = await (await ethers.getContractFactory("SnarlGame")).deploy(await token.getAddress(), treasury.address);
    await token.mint(player.address, ethers.parseEther("300"));
    await token.connect(player).approve(await game.getAddress(), ethers.parseEther("300"));
    await token.configure(await game.getAddress(), game.interface.encodeFunctionData("buy", [0]), false);
    await game.connect(player).buy(0);
    expect(await token.blocked()).to.equal(true);
    expect(await game.sales()).to.equal(1);
    await token.configure(ethers.ZeroAddress, "0x", true);
    await expect(game.connect(player).buy(0)).to.be.revertedWithCustomError(game, "UnsupportedToken");
    expect(await game.purchasedUnits(player.address, 0)).to.equal(5);
    expect(await game.volume()).to.equal(ethers.parseEther("100"));
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("100"));
  });
});
