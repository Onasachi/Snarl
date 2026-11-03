/**
 * The slice of SnarlWeekly the game calls. Written out rather than generated from the
 * build artifacts: the app should not need a Solidity toolchain to compile, and this is
 * small enough to read.
 *
 * Source of truth is contracts/contracts/SnarlWeekly.sol.
 */
export const snarlWeeklyAbi = [
  {
    type: "function",
    name: "knot",
    stateMutability: "view",
    inputs: [{ name: "week", type: "uint32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "closesAt", type: "uint64" },
          { name: "sweepableAt", type: "uint64" },
          { name: "pool", type: "uint128" },
          { name: "beads", type: "uint32" },
          { name: "entrants", type: "uint32" },
          { name: "share", type: "uint128" },
          { name: "settled", type: "bool" },
          { name: "edges", type: "bytes" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "entered",
    stateMutability: "view",
    inputs: [
      { name: "week", type: "uint32" },
      { name: "root", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "collected",
    stateMutability: "view",
    inputs: [
      { name: "week", type: "uint32" },
      { name: "root", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "enter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "week", type: "uint32" },
      { name: "xs", type: "int256[]" },
      { name: "ys", type: "int256[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "collect",
    stateMutability: "nonpayable",
    inputs: [{ name: "week", type: "uint32" }],
    outputs: [],
  },
] as const;
