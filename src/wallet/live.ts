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
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { giftDigest, snarlGiftsAbi } from "~/chain/snarlGifts";
import { snarlWeeklyAbi } from "~/chain/snarlWeekly";
import type {
  Address,
  ClaimStatus,
  TipStatus,
  WalletAccount,
  WalletPort,
  WeekStatus,
} from "./port";

/**
 * The Great Untangle's pool. Unset until it is deployed, and while it is unset the game
 * behaves exactly as it did before there was a contract: the weekly screen counts the
 * player's own passes and promises nothing.
 */
const WEEKLY_ADDRESS = import.meta.env.VITE_SNARL_WEEKLY as Address | undefined;

/**
 * The gift escrow. Unset until it is deployed, and while it is unset a gift is a creature
 * and nothing else — exactly what it was before.
 */
const GIFTS_ADDRESS = import.meta.env.VITE_SNARL_GIFTS as Address | undefined;

/** How long a sender has to wait before an unopened gift can be taken back. */
const GIFT_WINDOW = 30n * 24n * 3600n;

/** GoodDollar has no testnet: staging and production are different contracts on Celo. */
const ENV =
  (import.meta.env.VITE_GOODDOLLAR_ENV as "production" | "staging" | undefined) ?? "production";

const CELO_ID = SupportedChains.CELO;
const CELO_HEX = `0x${CELO_ID.toString(16)}`;

/** What the identity registry returns for someone it has no record of. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/**
 * The link's one-time key, as a signer. The 32 random bytes in the fragment *are* a
 * private key, which is what makes a gift claimable by whoever holds the link and by
 * nobody else.
 */
const giftSigner = (key: string) => {
  const padded = key.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const hex = Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join(
    "",
  );
  return privateKeyToAccount(`0x${hex}`);
};

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
  let walletClient: ReturnType<typeof createWalletClient> | null = null;

  const contracts = chainConfigs[CELO_ID].contracts[ENV];
  const decimals = CHAIN_DECIMALS[CELO_ID];

  const publicClient = createPublicClient({ chain: celo, transport: http() });

  async function ready() {
    if (!provider || !address || !claimSdk || !identitySdk) throw new Error("wallet not connected");
    return { provider, address, claimSdk, identitySdk };
  }

  return {
    tipsSupported: GIFTS_ADDRESS !== undefined,

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

      walletClient = createWalletClient({
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

    async week(id: number): Promise<WeekStatus | null> {
      if (!WEEKLY_ADDRESS) return null;
      const { address: account, identitySdk: identity } = await ready();
      const { root } = await identity.getWhitelistedRoot(account);

      // Who this wallet collects as, the contract's way round. Entries are filed under a
      // person's identity root, but the contract takes an address already down as an
      // entrant at its word, verified today or not — GoodDollar asks people to re-verify
      // on a ladder that starts at three days and the week is seven, so by Sunday the
      // registry may have no root to offer. The wallet's own address is therefore the
      // first place to look, and the root only the fallback for a linked wallet.
      const filedUnder = [account, root].filter(
        (a, i, all) => a !== ZERO_ADDRESS && all.indexOf(a) === i,
      );
      const read = (fn: "entered" | "collected", who: Address) =>
        publicClient.readContract({
          address: WEEKLY_ADDRESS,
          abi: snarlWeeklyAbi,
          functionName: fn,
          args: [id, who],
        });

      const [knot, entries, collections] = await Promise.all([
        publicClient.readContract({
          address: WEEKLY_ADDRESS,
          abi: snarlWeeklyAbi,
          functionName: "knot",
          args: [id],
        }),
        Promise.all(filedUnder.map((who) => read("entered", who as Address))),
        Promise.all(filedUnder.map((who) => read("collected", who as Address))),
      ]);

      // A week nobody has opened reads as all zeroes. That is not a week.
      if (knot.closesAt === 0n) return null;

      const mine = entries.indexOf(true);

      return {
        pool: knot.pool,
        entrants: knot.entrants,
        closesAt: new Date(Number(knot.closesAt) * 1000),
        settled: knot.settled,
        share: knot.share,
        entered: mine !== -1,
        collected: mine !== -1 ? (collections[mine] ?? false) : false,
        decimals,
      };
    },

    async enterWeek(id: number, xs: bigint[], ys: bigint[]) {
      if (!WEEKLY_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const hash = await walletClient.writeContract({
        address: WEEKLY_ADDRESS,
        abi: snarlWeeklyAbi,
        functionName: "enter",
        args: [id, xs, ys],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async collectWeek(id: number) {
      if (!WEEKLY_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const before = await this.week(id);
      const hash = await walletClient.writeContract({
        address: WEEKLY_ADDRESS,
        abi: snarlWeeklyAbi,
        functionName: "collect",
        args: [id],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { amount: before?.share ?? 0n };
    },

    async tip(key: string): Promise<TipStatus | null> {
      if (!GIFTS_ADDRESS) return null;
      // No wallet needed. Somebody opening their first gift link has not got one yet,
      // and should still be able to see what is waiting.
      const [from, amount, reclaimableAt, opened] = await publicClient.readContract({
        address: GIFTS_ADDRESS,
        abi: snarlGiftsAbi,
        functionName: "gifts",
        args: [giftSigner(key).address],
      });

      if (from === "0x0000000000000000000000000000000000000000") return null;
      return {
        from,
        amount,
        decimals,
        opened,
        reclaimableAt: new Date(Number(reclaimableAt) * 1000),
      };
    },

    async sendTip(key: string, amount: bigint) {
      if (!GIFTS_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      // Two transactions, and the approval has to land first: the escrow pulls the G$.
      const approval = await walletClient.writeContract({
        address: contracts!.g$Contract,
        abi: erc20Abi,
        functionName: "approve",
        args: [GIFTS_ADDRESS, amount],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash: approval });

      const hash = await walletClient.writeContract({
        address: GIFTS_ADDRESS,
        abi: snarlGiftsAbi,
        functionName: "send",
        args: [giftSigner(key).address, amount, GIFT_WINDOW],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async openTip(key: string) {
      if (!GIFTS_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const signer = giftSigner(key);
      const before = await this.tip(key);
      // Signed by the link, for this wallet. The signature is the claim; the transaction
      // around it only pays for the block space.
      const signature = await signer.signMessage({
        message: {
          raw: giftDigest({
            chainId: CELO_ID,
            contract: GIFTS_ADDRESS,
            key: signer.address,
            to: account,
          }),
        },
      });

      const hash = await walletClient.writeContract({
        address: GIFTS_ADDRESS,
        abi: snarlGiftsAbi,
        functionName: "open",
        args: [signer.address, account, signature],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { amount: before?.amount ?? 0n };
    },

    async reclaimTip(key: string) {
      if (!GIFTS_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const before = await this.tip(key);
      const hash = await walletClient.writeContract({
        address: GIFTS_ADDRESS,
        abi: snarlGiftsAbi,
        functionName: "reclaim",
        args: [giftSigner(key).address],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { amount: before?.amount ?? 0n };
    },

    async verificationLink(returnTo: string) {
      const { identitySdk: identity } = await ready();
      // GoodDollar's own hosted face check, on their domain. It asks the wallet to sign a
      // message first, so the player sees their wallet before they see a camera.
      return identity.generateFVLink(false, returnTo, CELO_ID);
    },
  };
}
