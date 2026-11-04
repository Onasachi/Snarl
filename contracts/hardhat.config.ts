import "@nomicfoundation/hardhat-toolbox";
import type { HardhatUserConfig } from "hardhat/config";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

/**
 * Celo, because that is where GoodDollar's identity and G$ live — and only there. There is
 * no testnet to rehearse on: Alfajores has been retired (its RPC host no longer resolves)
 * and Celo Sepolia, which replaced it, holds none of GoodDollar's contracts. So the dress
 * rehearsal is a local fork of Celo itself, against the real token and the real identity
 * registry. `FORK=1 pnpm test` runs it.
 */
const FORK_URL = process.env.FORK_RPC ?? "https://forno.celo.org";
/** Pinned so the verified accounts the fork test names stay verified. */
const FORK_BLOCK = Number(process.env.FORK_BLOCK ?? 81_816_364);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    // Celo is an OP-stack chain well past Cancun, and OpenZeppelin 5.6 needs `mcopy`.
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  networks: {
    hardhat: process.env.FORK
      ? {
          chainId: 42220,
          forking: { url: FORK_URL, blockNumber: FORK_BLOCK },
          // Celo is an OP-stack chain whose hardfork history Hardhat does not ship, so it
          // has to be told that the fork point is post-Cancun.
          chains: { 42220: { hardforkHistory: { cancun: 31056500 } } },
        }
      : {},
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  // A forked test reaches out over the network for every slot it touches.
  mocha: { timeout: process.env.FORK ? 300_000 : 20_000 },
  // Etherscan's V2 API, one key for every chain it covers, Celo included. The old
  // per-chain V1 endpoints are retired and answer with a deprecation notice rather than
  // a verification.
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY ?? process.env.CELOSCAN_API_KEY ?? "" },
};

export default config;
