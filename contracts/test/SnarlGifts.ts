import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const TIP = ethers.parseEther("50");
const WINDOW = 30 * 24 * 3600;

async function setup() {
  const [sender, recipient, bystander, thief] = await ethers.getSigners();
  const g$ = await (await ethers.getContractFactory("MockG")).deploy();
  const gifts = await (await ethers.getContractFactory("SnarlGifts")).deploy(await g$.getAddress());

  await g$.mint(sender.address, TIP * 10n);
  await g$.connect(sender).approve(await gifts.getAddress(), TIP * 10n);

  // The one-time key that rides in the gift link. Nobody's wallet; nobody's identity.
  const link = ethers.Wallet.createRandom();

  return { sender, recipient, bystander, thief, g$, gifts, link };
}

/** The link's key signing "pay this gift to that address", the way the app will. */
async function signFor(
  gifts: { getAddress(): Promise<string> },
  link: ethers.HDNodeWallet | ethers.Wallet,
  to: string,
) {
  const inner = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["string", "uint256", "address", "address", "address"],
      ["snarl gift", 31337, await gifts.getAddress(), link.address, to],
    ),
  );
  return link.signMessage(ethers.getBytes(inner));
}

describe("SnarlGifts", () => {
  it("builds the digest the app builds", async () => {
    const { gifts, recipient, link } = await setup();
    // The app's copy of this lives in src/chain/snarlGifts.ts and is checked against a
    // vector from here by test/gift-digest.test.ts. If the two ever part company, every
    // gift becomes unclaimable, and the money is already escrowed by then.
    const inner = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "uint256", "address", "address", "address"],
        ["snarl gift", 31337, await gifts.getAddress(), link.address, recipient.address],
      ),
    );
    expect(await gifts.digest(link.address, recipient.address)).to.equal(
      ethers.hashMessage(ethers.getBytes(inner)),
    );
  });

  describe("sending", () => {
    it("holds the money and files it under the link's key", async () => {
      const { gifts, g$, sender, link } = await setup();
      await expect(gifts.connect(sender).send(link.address, TIP, WINDOW))
        .to.emit(gifts, "Gifted")
        .withArgs(link.address, sender.address, TIP, anyValue);

      expect(await g$.balanceOf(await gifts.getAddress())).to.equal(TIP);
      const gift = await gifts.gifts(link.address);
      expect(gift.from).to.equal(sender.address);
      expect(gift.amount).to.equal(TIP);
      expect(gift.opened).to.equal(false);
    });

    it("will not reuse a key, so one link is one gift", async () => {
      const { gifts, sender, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      await expect(
        gifts.connect(sender).send(link.address, TIP, WINDOW),
      ).to.be.revertedWithCustomError(gifts, "KeyInUse");
    });

    it("refuses an empty gift and an unreasonable window", async () => {
      const { gifts, sender, link } = await setup();
      await expect(gifts.connect(sender).send(link.address, 0, WINDOW)).to.be.revertedWithCustomError(
        gifts,
        "NothingToGive",
      );
      await expect(
        gifts.connect(sender).send(link.address, TIP, 3600),
      ).to.be.revertedWithCustomError(gifts, "BadWindow");
      await expect(
        gifts.connect(sender).send(link.address, TIP, 400 * 24 * 3600),
      ).to.be.revertedWithCustomError(gifts, "BadWindow");
    });
  });

  describe("opening", () => {
    it("pays whoever the link's key signed for", async () => {
      const { gifts, g$, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      const signature = await signFor(gifts, link, recipient.address);
      await expect(
        gifts.connect(recipient).open(link.address, recipient.address, signature),
      ).to.changeTokenBalance(g$, recipient, TIP);
      expect(await g$.balanceOf(await gifts.getAddress())).to.equal(0);
    });

    it("cannot be re-aimed by somebody watching the mempool", async () => {
      const { gifts, sender, recipient, thief, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      // The whole reason this is a signature and not a secret: the thief has the entire
      // signature, in public, before it is mined — and it is no use to them.
      const signature = await signFor(gifts, link, recipient.address);
      await expect(
        gifts.connect(thief).open(link.address, thief.address, signature),
      ).to.be.revertedWithCustomError(gifts, "WrongKey");
    });

    it("lets anyone pay the gas, because the recipient may have none", async () => {
      const { gifts, g$, sender, recipient, bystander, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      const signature = await signFor(gifts, link, recipient.address);
      await expect(
        gifts.connect(bystander).open(link.address, recipient.address, signature),
      ).to.changeTokenBalances(g$, [recipient, bystander], [TIP, 0]);
    });

    it("turns away a signature from any other key", async () => {
      const { gifts, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      const impostor = ethers.Wallet.createRandom();
      const inner = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["string", "uint256", "address", "address", "address"],
          ["snarl gift", 31337, await gifts.getAddress(), link.address, recipient.address],
        ),
      );
      await expect(
        gifts.open(link.address, recipient.address, await impostor.signMessage(ethers.getBytes(inner))),
      ).to.be.revertedWithCustomError(gifts, "WrongKey");
    });

    it("will not work against a different deployment", async () => {
      const { gifts, g$, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      const signature = await signFor(gifts, link, recipient.address);

      const other = await (
        await ethers.getContractFactory("SnarlGifts")
      ).deploy(await g$.getAddress());
      await g$.connect(sender).approve(await other.getAddress(), TIP);
      await other.connect(sender).send(link.address, TIP, WINDOW);

      await expect(
        other.open(link.address, recipient.address, signature),
      ).to.be.revertedWithCustomError(other, "WrongKey");
    });

    it("opens once", async () => {
      const { gifts, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      const signature = await signFor(gifts, link, recipient.address);

      await gifts.open(link.address, recipient.address, signature);
      await expect(
        gifts.open(link.address, recipient.address, signature),
      ).to.be.revertedWithCustomError(gifts, "AlreadyOpened");
    });

    it("is still a gift after the window, if nobody took it back", async () => {
      const { gifts, g$, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      await time.increase(WINDOW + 86400);

      const signature = await signFor(gifts, link, recipient.address);
      await expect(
        gifts.open(link.address, recipient.address, signature),
      ).to.changeTokenBalance(g$, recipient, TIP);
    });

    it("has nothing to say about a link nobody put money behind", async () => {
      const { gifts, recipient, link } = await setup();
      await expect(
        gifts.open(link.address, recipient.address, await signFor(gifts, link, recipient.address)),
      ).to.be.revertedWithCustomError(gifts, "NoGift");
    });
  });

  describe("taking it back", () => {
    it("returns an unopened gift to its sender, after the window", async () => {
      const { gifts, g$, sender, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);

      await expect(gifts.connect(sender).reclaim(link.address)).to.be.revertedWithCustomError(
        gifts,
        "TooSoon",
      );
      await time.increase(WINDOW + 1);
      await expect(gifts.connect(sender).reclaim(link.address)).to.changeTokenBalance(
        g$,
        sender,
        TIP,
      );
    });

    it("belongs to the sender and nobody else", async () => {
      const { gifts, sender, thief, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      await time.increase(WINDOW + 1);
      await expect(gifts.connect(thief).reclaim(link.address)).to.be.revertedWithCustomError(
        gifts,
        "NotYours",
      );
    });

    it("is too late once the gift is open", async () => {
      const { gifts, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      await gifts.open(link.address, recipient.address, await signFor(gifts, link, recipient.address));

      await time.increase(WINDOW + 1);
      await expect(gifts.connect(sender).reclaim(link.address)).to.be.revertedWithCustomError(
        gifts,
        "AlreadyOpened",
      );
    });

    it("closes the link behind it", async () => {
      const { gifts, sender, recipient, link } = await setup();
      await gifts.connect(sender).send(link.address, TIP, WINDOW);
      await time.increase(WINDOW + 1);
      await gifts.connect(sender).reclaim(link.address);

      await expect(
        gifts.open(link.address, recipient.address, await signFor(gifts, link, recipient.address)),
      ).to.be.revertedWithCustomError(gifts, "AlreadyOpened");
    });
  });
});

/** Matches any argument, for the timestamp the contract computes itself. */
const anyValue = (): boolean => true;
