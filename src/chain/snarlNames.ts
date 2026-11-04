/**
 * The slice of SnarlNames the game calls.
 *
 * Source of truth is contracts/contracts/SnarlNames.sol.
 */
export const snarlNamesAbi = [
  {
    type: "function",
    name: "nameOf",
    stateMutability: "view",
    inputs: [{ name: "root", type: "address" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "namesOf",
    stateMutability: "view",
    inputs: [{ name: "roots", type: "address[]" }],
    outputs: [{ name: "", type: "string[]" }],
  },
  {
    type: "function",
    name: "rootOf",
    stateMutability: "view",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
] as const;

/** Lowercase, digits and underscore, 3–20 characters, exactly as the contract insists. */
export const NAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const nameIsValid = (name: string): boolean => NAME_PATTERN.test(name);
