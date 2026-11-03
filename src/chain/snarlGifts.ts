import { encodeAbiParameters, keccak256 } from "viem";
import type { Address } from "~/wallet";

/**
 * The slice of SnarlGifts the game calls. Written out rather than generated from the
 * build artifacts: the app should not need a Solidity toolchain to compile, and this is
 * small enough to read.
 *
 * Source of truth is contracts/contracts/SnarlGifts.sol.
 */
export const snarlGiftsAbi = [
  {
    type: "function",
    name: "gifts",
    stateMutability: "view",
    inputs: [{ name: "key", type: "address" }],
    outputs: [
      { name: "from", type: "address" },
      { name: "amount", type: "uint128" },
      { name: "reclaimableAt", type: "uint64" },
      { name: "opened", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "send",
    stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "window", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "open",
    stateMutability: "nonpayable",
    inputs: [
      { name: "key", type: "address" },
      { name: "to", type: "address" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "reclaim",
    stateMutability: "nonpayable",
    inputs: [{ name: "key", type: "address" }],
    outputs: [],
  },
] as const;

/**
 * What a gift link's key has to sign, byte for byte as `SnarlGifts.digest` builds it.
 *
 * The signature is the claim, so if this and the Solidity disagree by one byte then every
 * gift ever sent is unclaimable. `contracts/test/SnarlGifts.ts` checks the contract
 * against this same vector, and `test/gift-digest.test.ts` checks this against a hash
 * taken from the contract itself.
 *
 * The recipient is inside what is signed. That is the whole security of the thing: a
 * signature seen in the mempool is good for one address and useless re-aimed.
 */
export const giftDigest = ({
  chainId,
  contract,
  key,
  to,
}: {
  chainId: number;
  contract: Address;
  key: Address;
  to: Address;
}) =>
  keccak256(
    encodeAbiParameters(
      [
        { type: "string" },
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
      ],
      ["snarl gift", BigInt(chainId), contract, key, to],
    ),
  );
