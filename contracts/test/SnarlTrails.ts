import { expect } from "chai";
import { ethers } from "hardhat";

async function setup() {
  const [creator, buyer, linkedBuyer, other, treasury] = await ethers.getSigners();
  const token = await (await ethers.getContractFactory("MockG")).deploy();
  const identity = await (await ethers.getContractFactory("MockIdentity")).deploy();
  const market = await (await ethers.getContractFactory("SnarlTrails")).deploy(await token.getAddress(), await identity.getAddress(), treasury.address);
  for (const who of [creator, buyer]) await identity.link(who.address, who.address);
  await identity.link(linkedBuyer.address, buyer.address);
  for (const who of [buyer, linkedBuyer, other]) {
    await token.mint(who.address, ethers.parseEther("1000"));
    await token.connect(who).approve(await market.getAddress(), ethers.MaxUint256);
  }
  const price = ethers.parseEther("100");
  await market.publish("The lily trail", price, 42, [0, 3, 5], 1);
  return { market, token, identity, creator, buyer, linkedBuyer, other, treasury, price };
}

describe("SnarlTrails", () => {
  it("splits a sale 90/10 and conserves every token through withdrawal", async () => {
    const { market, token, creator, buyer, treasury, price } = await setup();
    await expect(market.connect(buyer).buy(0, price)).to.emit(market, "Purchased").withArgs(0, buyer.address, buyer.address, price, price * 9n / 10n);
    expect(await market.purchased(buyer.address, 0)).to.equal(true);
    expect(await market.credit(creator.address)).to.equal(price * 9n / 10n);
    expect(await market.credit(treasury.address)).to.equal(price / 10n);
    expect(await market.liability()).to.equal(await token.balanceOf(await market.getAddress()));
    await market.connect(creator).withdraw(); await market.connect(treasury).withdraw();
    expect(await token.balanceOf(creator.address)).to.equal(price * 9n / 10n);
    expect(await market.liability()).to.equal(0);
    expect(await token.balanceOf(await market.getAddress())).to.equal(0);
    await expect(market.withdraw()).to.be.revertedWithCustomError(market, "NothingToWithdraw");
  });
  it("rejects unverified publishing, malformed recipes and out-of-range prices", async () => {
    const { market, other, price } = await setup();
    await expect(market.connect(other).publish("Hello", price, 0, [0,1,2], 0)).to.be.revertedWithCustomError(market, "NotVerified");
    for (const [title, amount, creatures, palette] of [["x",price,[0,1,2],0], ["Hello",0,[0,1,2],0], ["Hello",ethers.parseEther("10001"),[0,1,2],0], ["Hello",price,[0,0,2],0], ["Hello",price,[0,1,10],0], ["Hello",price,[0,1,2],3]] as const) {
      await expect(market.publish(title, amount, 0, creatures, palette)).to.be.revertedWithCustomError(market, "Invalid");
    }
  });
  it("prevents duplicate purchases, self-sales including linked wallets, and stale quotes", async () => {
    const { market, buyer, creator, identity, other, price } = await setup();
    await expect(market.buy(0, price)).to.be.revertedWithCustomError(market, "SelfPurchase");
    await identity.link(other.address, creator.address);
    await expect(market.connect(other).buy(0, price)).to.be.revertedWithCustomError(market, "SelfPurchase");
    await expect(market.connect(buyer).buy(0, price-1n)).to.be.revertedWithCustomError(market, "PriceChanged");
    await market.connect(buyer).buy(0, price);
    await expect(market.connect(buyer).buy(0, price)).to.be.revertedWithCustomError(market, "AlreadyOwned");
  });
  it("retains paid access and earned credit after delisting and verification expiry", async () => {
    const { market, buyer, other, creator, identity, price } = await setup();
    await market.connect(buyer).buy(0, price);
    await expect(market.connect(other).setActive(0, false)).to.be.revertedWithCustomError(market, "NotCreator");
    await market.setActive(0, false);
    await expect(market.connect(other).buy(0, price)).to.be.revertedWithCustomError(market, "Unavailable");
    expect(await market.purchased(buyer.address, 0)).to.equal(true);
    await identity.link(creator.address, ethers.ZeroAddress);
    await market.withdraw();
  });
  it("counts wallet buyers separately from unique verified roots and excludes unverified roots", async () => {
    const { market, buyer, linkedBuyer, other, price } = await setup();
    for (const who of [buyer, linkedBuyer, other]) await market.connect(who).buy(0, price);
    expect(await market.sales()).to.equal(3);
    expect(await market.buyers()).to.equal(3);
    expect(await market.verifiedBuyers()).to.equal(1);
    expect(await market.volume()).to.equal(price*3n);
    expect(await market.creatorRevenue() + await market.protocolRevenue()).to.equal(await market.volume());
  });
  it("rolls failed payments back without issuing an entitlement or volume", async () => {
    const { market, token, buyer, price } = await setup();
    await token.connect(buyer).approve(await market.getAddress(), 0);
    await expect(market.connect(buyer).buy(0, price)).to.be.reverted;
    expect(await market.purchased(buyer.address, 0)).to.equal(false);
    expect(await market.sales()).to.equal(0);
    expect(await market.liability()).to.equal(0);
  });
  it("paginates bounded reads and preserves immutable recipes", async () => {
    const { market } = await setup();
    expect((await market.page(0, 50)).length).to.equal(1);
    expect((await market.page(100, 10)).length).to.equal(0);
    await expect(market.page(0, 51)).to.be.revertedWithCustomError(market,"Invalid");
    const recipe = await market.trail(0);
    expect(recipe.title).to.equal("The lily trail");
    expect(recipe.seed).to.equal(42);
    expect(recipe.creatures).to.deep.equal([0n,3n,5n]);
  });
});

describe("SnarlTrails adversarial payments", () => {
  it("blocks callbacks during purchase and withdrawal; rejects transfer-fee shortfalls", async () => {
    const [creator, buyer, treasury] = await ethers.getSigners();
    const token = await (await ethers.getContractFactory("CallbackG")).deploy();
    const identity = await (await ethers.getContractFactory("MockIdentity")).deploy();
    await identity.link(creator.address, creator.address);
    const market = await (await ethers.getContractFactory("SnarlTrails")).deploy(await token.getAddress(), await identity.getAddress(), treasury.address);
    const price = ethers.parseEther("10");
    await market.publish("A short route", price, 10, [0,1,2], 0);
    await token.mint(buyer.address, price*2n);
    await token.connect(buyer).approve(await market.getAddress(), price*2n);
    await token.configure(await market.getAddress(), market.interface.encodeFunctionData("buy",[0,price]), false);
    await market.connect(buyer).buy(0,price);
    expect(await token.blocked()).to.equal(true);
    expect(await market.sales()).to.equal(1);
    await token.configure(await market.getAddress(), market.interface.encodeFunctionData("withdraw"), false);
    await market.withdraw();
    expect(await token.blocked()).to.equal(true);
    expect(await market.credit(creator.address)).to.equal(0);
    await market.publish("Another route", price, 11, [1,2,3], 0);
    await token.configure(ethers.ZeroAddress,"0x",true);
    await expect(market.connect(buyer).buy(1,price)).to.be.revertedWithCustomError(market,"UnsupportedToken");
    expect(await market.purchased(buyer.address,1)).to.equal(false);
    expect(await market.sales()).to.equal(1);
    expect(await token.balanceOf(await market.getAddress())).to.equal(await market.liability());
  });
});

describe("SnarlTrails repeat spending", () => {
  it("counts a repeat buyer once after their second distinct purchase", async () => {
    const { market, buyer, price } = await setup();
    await market.publish("A second path", price, 200, [1,2,3], 1);
    await market.publish("A third path", price, 201, [2,3,4], 2);
    await market.connect(buyer).buy(0,price);
    expect(await market.repeatBuyers()).to.equal(0);
    await market.connect(buyer).buy(1,price);
    await market.connect(buyer).buy(2,price);
    expect(await market.repeatBuyers()).to.equal(1);
    expect(await market.buyers()).to.equal(1);
    expect(await market.purchasesByBuyer(buyer.address)).to.equal(3);
  });
});
