import { parseAbi } from "viem";
export const snarlGameAbi = parseAbi([
  "struct Run { bytes32 id; uint32 level; uint16 crossings; uint32 moves; uint16 par; bool assisted; bytes32 solutionHash; }",
  "struct Player { uint32 runs; uint64 crossings; uint64 points; }",
  "function recordRun(Run run)",
  "function recorded(address, bytes32) view returns (bool)",
  "function players(address) view returns (uint32 runs, uint64 crossings, uint64 points)",
  "function page(uint256 offset, uint256 limit) view returns (address[] wallets, Player[] records)",
  "function playerCount() view returns (uint256)",
  "function runCount() view returns (uint256)",
  "function offer(uint8 item) view returns (uint256 price, uint256 units)",
  "function buy(uint8 item)",
  "function purchasedUnits(address buyer, uint8 item) view returns (uint256)",
  "function sales() view returns (uint256)",
  "function buyers() view returns (uint256)",
  "function volume() view returns (uint256)",
]);
