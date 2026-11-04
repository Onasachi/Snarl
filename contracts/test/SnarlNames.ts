import { expect } from "chai";
import { ethers } from "hardhat";

async function setup() {
  const [ada, adaSecondWallet, bob, stranger] = await ethers.getSigners();
  const identity = await (await ethers.getContractFactory("MockIdentity")).deploy();
  const names = await (
    await ethers.getContractFactory("SnarlNames")
  ).deploy(await identity.getAddress());

  await identity.link(ada.address, ada.address);
  await identity.link(adaSecondWallet.address, ada.address);
  await identity.link(bob.address, bob.address);

  return { ada, adaSecondWallet, bob, stranger, identity, names };
}

describe("SnarlNames", () => {
  it("gives a verified person a name", async () => {
    const { names, ada } = await setup();
    await expect(names.connect(ada).claim("ada_lovelace"))
      .to.emit(names, "Claimed")
      .withArgs(ada.address, "ada_lovelace", ada.address);

    expect(await names.nameOf(ada.address)).to.equal("ada_lovelace");
    expect(await names.rootOf("ada_lovelace")).to.equal(ada.address);
    expect(await names.claimed()).to.equal(1);
  });

  it("names the person, not the wallet", async () => {
    const { names, ada, adaSecondWallet } = await setup();
    // Claimed from the second wallet, and it is still Ada's name.
    await names.connect(adaSecondWallet).claim("ada");
    expect(await names.nameOf(ada.address)).to.equal("ada");
    expect(await names.rootOf("ada")).to.equal(ada.address);
  });

  it("has nothing for somebody GoodDollar has not verified", async () => {
    const { names, stranger } = await setup();
    await expect(names.connect(stranger).claim("ghost")).to.be.revertedWithCustomError(
      names,
      "NotVerified",
    );
  });

  it("takes lowercase, digits and underscore, and nothing else", async () => {
    const { names, ada } = await setup();
    for (const bad of [
      "ab", // too short
      "a".repeat(21), // too long
      "Ada", // a capital, which is how one name is made to look like another
      "ada lovelace",
      "ada-lovelace",
      "ada.eth",
      "adä",
      "🐟🐟🐟",
      "",
    ]) {
      await expect(names.connect(ada).claim(bad), bad).to.be.revertedWithCustomError(
        names,
        "BadName",
      );
    }
    await names.connect(ada).claim("ada_99");
    expect(await names.nameOf(ada.address)).to.equal("ada_99");
  });

  it("will not give one name to two people", async () => {
    const { names, ada, bob } = await setup();
    await names.connect(ada).claim("pip");
    await expect(names.connect(bob).claim("pip")).to.be.revertedWithCustomError(
      names,
      "NameTaken",
    );
  });

  it("lets somebody keep claiming the name they already have", async () => {
    const { names, ada } = await setup();
    await names.connect(ada).claim("pip");
    await names.connect(ada).claim("pip");
    expect(await names.claimed()).to.equal(1);
  });

  it("puts an old name back in circulation when its holder moves on", async () => {
    const { names, ada, bob } = await setup();
    await names.connect(ada).claim("pip");
    await expect(names.connect(ada).claim("bub"))
      .to.emit(names, "Released")
      .withArgs(ada.address, "pip");

    expect(await names.nameOf(ada.address)).to.equal("bub");
    expect(await names.rootOf("pip")).to.equal(ethers.ZeroAddress);
    expect(await names.claimed()).to.equal(1);

    await names.connect(bob).claim("pip");
    expect(await names.rootOf("pip")).to.equal(bob.address);
  });

  it("lets a person stop having a name", async () => {
    const { names, ada } = await setup();
    await names.connect(ada).claim("pip");
    await expect(names.connect(ada).release()).to.emit(names, "Released");

    expect(await names.nameOf(ada.address)).to.equal("");
    expect(await names.rootOf("pip")).to.equal(ethers.ZeroAddress);
    expect(await names.claimed()).to.equal(0);
    await expect(names.connect(ada).release()).to.be.revertedWithCustomError(names, "NoName");
  });

  it("still lets go of a name after verification has lapsed", async () => {
    const { names, identity, ada } = await setup();
    await names.connect(ada).claim("pip");

    // GoodDollar re-verifies on a ladder that starts at three days. Being asked to show
    // your face again should not mean being stuck with a name.
    await identity.link(ada.address, ethers.ZeroAddress);
    await names.connect(ada).release();
    expect(await names.nameOf(ada.address)).to.equal("");
  });

  it("reads a whole board's worth in one call", async () => {
    const { names, ada, bob } = await setup();
    await names.connect(ada).claim("ada");
    await names.connect(bob).claim("bob");
    expect(await names.namesOf([ada.address, bob.address, ethers.ZeroAddress])).to.deep.equal([
      "ada",
      "bob",
      "",
    ]);
  });
});
