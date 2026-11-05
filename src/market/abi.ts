import { parseAbi } from "viem";
export const trailsAbi = parseAbi([
  "struct Trail { address creator; address root; uint96 price; uint32 seed; uint8[3] creatures; uint8 palette; bool active; string title; }",
  "function count() view returns (uint256)",
  "function page(uint256 offset, uint256 limit) view returns (Trail[])",
  "function purchased(address account, uint256 id) view returns (bool)",
  "function credit(address account) view returns (uint256)",
  "function sales() view returns (uint256)",
  "function repeatBuyers() view returns (uint256)",
  "function buyers() view returns (uint256)",
  "function verifiedBuyers() view returns (uint256)",
  "function creators() view returns (uint256)",
  "function volume() view returns (uint256)",
  "function creatorRevenue() view returns (uint256)",
  "function protocolRevenue() view returns (uint256)",
  "function publish(string title, uint96 price, uint32 seed, uint8[3] creatures, uint8 palette) returns (uint256)",
  "function buy(uint256 id, uint256 expectedPrice)",
  "function withdraw()",
]);
