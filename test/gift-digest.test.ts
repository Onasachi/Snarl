import { hashMessage } from "viem";
import { describe, expect, it } from "vitest";
import { giftDigest } from "~/chain/snarlGifts";

/**
 * The one place where a one-byte disagreement would make every gift ever sent
 * unclaimable: the client signs a digest, the contract rebuilds it, and nothing checks
 * them against each other at runtime because by then the money is already escrowed.
 *
 * These two hashes came out of `SnarlGifts.digest` on a real deployment, through ethers.
 * This test says viem agrees — a different library, a different encoder, the same bytes.
 */
const VECTOR = {
  chainId: 42220,
  contract: "0x1111111111111111111111111111111111111111",
  key: "0x2222222222222222222222222222222222222222",
  to: "0x3333333333333333333333333333333333333333",
  inner: "0x46aec9258c23986f2825d52fc38954381ec53647d51c9f65e59a38752322570f",
  /** What `toEthSignedMessageHash` makes of it, which is what is actually signed. */
  signed: "0x10b4e56f679fc80ea135febd06d6fd1782d1524047cbfb9b3a74d134b570a21d",
} as const;

describe("the gift digest", () => {
  it("is what the contract builds", () => {
    expect(
      giftDigest({
        chainId: VECTOR.chainId,
        contract: VECTOR.contract,
        key: VECTOR.key,
        to: VECTOR.to,
      }),
    ).toBe(VECTOR.inner);
  });

  it("is signed the way the contract expects it to be", () => {
    expect(hashMessage({ raw: VECTOR.inner })).toBe(VECTOR.signed);
  });

  it("names the recipient, so a signature cannot be re-aimed", () => {
    const base = { chainId: VECTOR.chainId, contract: VECTOR.contract, key: VECTOR.key } as const;
    const mine = giftDigest({ ...base, to: VECTOR.to });
    const theirs = giftDigest({ ...base, to: "0x4444444444444444444444444444444444444444" });
    expect(mine).not.toBe(theirs);
  });

  it("is bound to one chain and one deployment", () => {
    const base = { contract: VECTOR.contract, key: VECTOR.key, to: VECTOR.to } as const;
    expect(giftDigest({ ...base, chainId: 1 })).not.toBe(giftDigest({ ...base, chainId: 42220 }));
    expect(
      giftDigest({
        chainId: 42220,
        contract: "0x5555555555555555555555555555555555555555",
        key: VECTOR.key,
        to: VECTOR.to,
      }),
    ).not.toBe(giftDigest({ ...base, chainId: 42220 }));
  });
});
