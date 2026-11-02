import {
  CHAIN_DECIMALS,
  ClaimSDK,
  chainConfigs,
  IdentitySDK,
  SupportedChains,
} from "@goodsdks/citizen-sdk";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { celo } from "viem/chains";
import type { Address, ClaimStatus, WalletAccount, WalletPort } from "./port";

/** GoodDollar has no testnet: staging and production are different contracts on Celo. */
const ENV =
  (import.meta.env.VITE_GOODDOLLAR_ENV as "production" | "staging" | undefined) ?? "production";

const CELO_ID = SupportedChains.CELO;
const CELO_HEX = `0x${CELO_ID.toString(16)}`;

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMiniPay?: boolean;
}

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/**
 * MiniPay injects itself like any other wallet, so there is nothing to design around:
 * if it is there we recognise it and say its name, and if it is not, whatever else is
 * injected works the same way.
 */
export const findProvider = (): Eip1193Provider | null =>
  (globalThis as { ethereum?: Eip1193Provider }).ethereum ?? null;

export const isMiniPay = (): boolean => findProvider()?.isMiniPay === true;

/**
 * The real wallet. Untested against a live wallet in this repo — there is no account
 * here to connect, and nobody should be moving someone else's money to find out.
 * Drive the UI with the demo adapter; this one needs a human with a phone.
 */
export function createLiveWallet(): WalletPort {
  let provider: Eip1193Provider | null = null;
  let address: Address | null = null;
  let claimSdk: ClaimSDK | null = null;
  let identitySdk: IdentitySDK | null = null;

  const contracts = chainConfigs[CELO_ID].contracts[ENV];
  const decimals = CHAIN_DECIMALS[CELO_ID];

  const publicClient = createPublicClient({ chain: celo, transport: http() });

  async function ready() {
    if (!provider || !address || !claimSdk || !identitySdk) throw new Error("wallet not connected");
    return { provider, address, claimSdk, identitySdk };
  }

  return {
    async connect(): Promise<WalletAccount> {
      const found = findProvider();
      if (!found) throw new Error("no-wallet");
      provider = found;

      const accounts = (await found.request({ method: "eth_requestAccounts" })) as string[];
      const first = accounts[0];
      if (!first) throw new Error("no-account");
      address = getAddress(first) as Address;

      // GoodDollar's contracts live on Celo. Ask once; the wallet decides.
      const chainId = Number(await found.request({ method: "eth_chainId" }));
      if (chainId !== CELO_ID) {
        await found.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CELO_HEX }],
        });
      }

      const walletClient = createWalletClient({
        account: address,
        chain: celo,
        transport: custom(found),
      });

      // The SDK's signatures take viem's chain-agnostic clients. Celo's specialised
      // transaction types make the concrete clients unassignable to them, which is a
      // typing quirk rather than a behavioural one.
      const sdkPublic = publicClient as unknown as PublicClient;
      const sdkWallet = walletClient as unknown as WalletClient;

      identitySdk = await IdentitySDK.init({
        publicClient: sdkPublic,
        walletClient: sdkWallet,
        env: ENV,
      });
      claimSdk = await ClaimSDK.init({
        publicClient: sdkPublic,
        walletClient: sdkWallet,
        identitySDK: identitySdk,
        env: ENV,
      });

      return { address, chainId: CELO_ID, label: found.isMiniPay ? "MiniPay" : "your wallet" };
    },

    async getClaimStatus(): Promise<ClaimStatus> {
      const { address: account, claimSdk: claim, identitySdk: identity } = await ready();

      const [{ isWhitelisted }, entitlement, balance] = await Promise.all([
        identity.getWhitelistedRoot(account),
        claim.checkEntitlement(),
        publicClient.readContract({
          address: contracts!.g$Contract,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account],
        }),
      ]);

      // nextClaimTime costs another round trip and only matters once there is nothing
      // left to claim today.
      const nextClaimAt = entitlement.amount > 0n ? null : await claim.nextClaimTime();

      return {
        verified: isWhitelisted,
        entitlement: entitlement.amount,
        nextClaimAt,
        balance: balance as bigint,
        decimals,
      };
    },

    async claim() {
      const { claimSdk: claim } = await ready();
      const before = await claim.checkEntitlement();
      await claim.claim();
      return { amount: before.amount };
    },

    async verificationLink(returnTo: string) {
      const { identitySdk: identity } = await ready();
      // GoodDollar's own hosted face check, on their domain. It asks the wallet to sign a
      // message first, so the player sees their wallet before they see a camera.
      return identity.generateFVLink(false, returnTo, CELO_ID);
    },
  };
}
