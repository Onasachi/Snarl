/**
 * The slice of SnarlBoard the game calls.
 *
 * Source of truth is contracts/contracts/SnarlBoard.sol.
 */
const record = {
  type: "tuple",
  components: [
    { name: "untangles", type: "uint32" },
    { name: "distinct", type: "uint32" },
    { name: "lastAt", type: "uint64" },
    { name: "freed", type: "uint256" },
  ],
} as const;

export const snarlBoardAbi = [
  {
    type: "function",
    name: "records",
    stateMutability: "view",
    inputs: [{ name: "root", type: "address" }],
    outputs: [
      { name: "untangles", type: "uint32" },
      { name: "distinct", type: "uint32" },
      { name: "lastAt", type: "uint64" },
      { name: "freed", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "playerCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "page",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [
      { name: "roots", type: "address[]" },
      { name: "found", type: "tuple[]", components: record.components },
    ],
  },
  {
    type: "function",
    name: "prove",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint8" },
      { name: "xs", type: "int256[]" },
      { name: "ys", type: "int256[]" },
    ],
    outputs: [],
  },
] as const;

/** A page of the weekly pool's own tally, which the board shows beside the untangles. */
export const weeklyPlayersAbi = [
  {
    type: "function",
    name: "playersOf",
    stateMutability: "view",
    inputs: [{ name: "roots", type: "address[]" }],
    outputs: [
      {
        name: "found",
        type: "tuple[]",
        components: [
          { name: "weeksEntered", type: "uint32" },
          { name: "lastSeq", type: "uint32" },
          { name: "streak", type: "uint32" },
          { name: "bestStreak", type: "uint32" },
        ],
      },
    ],
  },
] as const;
