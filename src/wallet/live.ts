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
  fallback,
  getAddress,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { snarlBoardAbi, weeklyPlayersAbi } from "~/chain/snarlBoard";
import { giftDigest, snarlGiftsAbi } from "~/chain/snarlGifts";
import { snarlNamesAbi } from "~/chain/snarlNames";
import { snarlWeeklyAbi } from "~/chain/snarlWeekly";
import { planFor, WEEK_PLANS, WEEKLY_KNOT } from "~/chain/weeks";
import type {
  Address,
  AdminState,
  AdminWeek,
  BoardRow,
  ClaimStatus,
  Standing,
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

/** The leaderboard, and the names on it. Either may be absent; the screen copes. */
const BOARD_ADDRESS = import.meta.env.VITE_SNARL_BOARD as Address | undefined;
const NAMES_ADDRESS = import.meta.env.VITE_SNARL_NAMES as Address | undefined;

/** One read covers a pond-sized game. Paging past this is a problem worth having. */
const BOARD_LIMIT = 500n;

/**
 * GoodDollar has no testnet. "staging" and "development" are *different identity
 * contracts on Celo mainnet* — three registries at three addresses, all live, all real.
 *
 * Which means a person verified on production reads as a complete stranger to the staging
 * contract, and the app would tell them, truthfully as far as it knows, that they are not
 * verified. So an unrecognised value is not passed through to the SDK to be looked up and
 * found missing: it falls back to production and says so.
 */
const KNOWN_ENVS = ["production", "staging", "development"] as const;
type GoodDollarEnv = (typeof KNOWN_ENVS)[number];

const ENV: GoodDollarEnv = (() => {
  const asked = import.meta.env.VITE_GOODDOLLAR_ENV as string | undefined;
  if (!asked) return "production";
  if ((KNOWN_ENVS as readonly string[]).includes(asked)) return asked as GoodDollarEnv;
  console.warn(
    `VITE_GOODDOLLAR_ENV="${asked}" is not one of ${KNOWN_ENVS.join(", ")}; using production.`,
  );
  return "production";
})();

const CELO_ID = SupportedChains.CELO;
const CELO_HEX = `0x${CELO_ID.toString(16)}`;

/** Enough for a wallet that has never heard of Celo to add it. */
const CELO_PARAMS = {
  chainId: CELO_HEX,
  chainName: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: ["https://forno.celo.org"],
  blockExplorerUrls: ["https://celoscan.io"],
};

/** What the identity registry returns for someone it has no record of. */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  isMiniPay?: boolean;
}

/** What a wallet announces about itself under EIP-6963. */
interface AnnouncedProvider {
  info: { uuid: string; name: string; rdns: string };
  provider: Eip1193Provider;
}

/** EIP-1193 says 4001 is the user declining and 4902 is a chain the wallet has never heard of. */
const errorCode = (cause: unknown): number | undefined => {
  const code = (cause as { code?: unknown })?.code;
  return typeof code === "number" ? code : undefined;
};

/** `lastAuthenticated` is non-zero for anybody GoodDollar has ever verified. */
const identityAbi = [
  {
    type: "function",
    name: "lastAuthenticated",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

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
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
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
 * Every wallet that answers, not just whichever one won the race to `window.ethereum`.
 *
 * With two extensions installed, `window.ethereum` is whoever loaded last, and that is
 * not necessarily the one holding the account somebody wants to use — the symptom being
 * an app that "doesn't recognise my wallet" while the wallet is sitting right there.
 * EIP-6963 exists for exactly this: wallets announce themselves and the page collects
 * them.
 */
export async function announcedProviders(): Promise<AnnouncedProvider[]> {
  const found = new Map<string, AnnouncedProvider>();
  const listen = (event: Event) => {
    const detail = (event as CustomEvent<AnnouncedProvider>).detail;
    if (detail?.info?.uuid) found.set(detail.info.uuid, detail);
  };

  window.addEventListener("eip6963:announceProvider", listen);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  // Wallets answer synchronously, but a tick costs nothing and covers the ones that do not.
  await new Promise((done) => setTimeout(done, 60));
  window.removeEventListener("eip6963:announceProvider", listen);

  return [...found.values()];
}

/** Whatever was injected the old way, if anything was. */
export const findProvider = (): Eip1193Provider | null =>
  (globalThis as { ethereum?: Eip1193Provider }).ethereum ?? null;

/**
 * The one to talk to.
 *
 * MiniPay first, because inside MiniPay there is nothing else to mean. Otherwise the
 * wallet that has already authorised an account for this site, which is as close as a
 * page can get to "the one you meant" without asking — and asking every time would be
 * worse for the many people who only have one.
 */
export async function chooseProvider(): Promise<Eip1193Provider | null> {
  const injected = findProvider();
  if (injected?.isMiniPay) return injected;

  const announced = await announcedProviders();
  if (announced.length === 0) return injected;
  if (announced.length === 1) return announced[0]?.provider ?? injected;

  for (const candidate of announced) {
    try {
      const accounts = (await candidate.provider.request({ method: "eth_accounts" })) as string[];
      if (accounts.length > 0) return candidate.provider;
    } catch {
      // A wallet that will not answer a question with no prompt is not the one.
    }
  }
  return announced[0]?.provider ?? injected;
}

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
  /** False when the wallet would not move to Celo. Reads are fine; signing is not. */
  let onCelo = false;

  const contracts = chainConfigs[CELO_ID].contracts[ENV];
  const decimals = CHAIN_DECIMALS[CELO_ID];

  /**
   * Reads go through our own client, never the wallet's, so what the chain says does not
   * depend on which network a wallet happens to be pointed at. Two endpoints rather than
   * one: a rate limit on a single RPC would otherwise read, to a player, as the app
   * deciding they are not verified.
   */
  const publicClient = createPublicClient({
    chain: celo,
    transport: fallback(
      (chainConfigs[CELO_ID]?.rpcUrls ?? ["https://forno.celo.org"]).map((url) => http(url)),
    ),
  });

  async function ready() {
    if (!provider || !address || !claimSdk || !identitySdk) throw new Error("wallet not connected");
    return { provider, address, claimSdk, identitySdk };
  }

  return {
    tipsSupported: GIFTS_ADDRESS !== undefined,
    boardSupported: BOARD_ADDRESS !== undefined,

    async connect(): Promise<WalletAccount> {
      const found = await chooseProvider();
      if (!found) throw new Error("no-wallet");
      provider = found;

      const accounts = (await found.request({ method: "eth_requestAccounts" })) as string[];
      const first = accounts[0];
      if (!first) throw new Error("no-account");
      address = getAddress(first) as Address;

      // GoodDollar's contracts are on Celo, so that is where anything signed has to go.
      // Asking is worth doing and failing at it is not worth refusing a connection over:
      // every read below goes through our own Celo client regardless, so somebody whose
      // wallet will not switch can still be told what GoodDollar says about them. Only
      // signing needs the wallet itself to be on Celo, and that is checked when it is.
      onCelo = Number(await found.request({ method: "eth_chainId" })) === CELO_ID;
      if (!onCelo) {
        try {
          await found.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CELO_HEX }],
          });
          onCelo = true;
        } catch (cause) {
          // 4902: a wallet that has never been told Celo exists. Offer it, once.
          if (errorCode(cause) === 4902) {
            try {
              await found.request({ method: "wallet_addEthereumChain", params: [CELO_PARAMS] });
              onCelo = true;
            } catch {
              // Declined, or the wallet does not do this. Reads still work.
            }
          }
        }
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

      return {
        address,
        chainId: CELO_ID,
        label: found.isMiniPay ? "MiniPay" : "your wallet",
        onCelo,
      };
    },

    async getClaimStatus(): Promise<ClaimStatus> {
      const { address: account, claimSdk: claim, identitySdk: identity } = await ready();

      const [{ isWhitelisted }, entitlement, balance, lastAuthenticated] = await Promise.all([
        identity.getWhitelistedRoot(account),
        claim.checkEntitlement(),
        publicClient.readContract({
          address: contracts!.g$Contract,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account],
        }),
        publicClient.readContract({
          address: contracts!.identityContract,
          abi: identityAbi,
          functionName: "lastAuthenticated",
          args: [account],
        }),
      ]);

      // nextClaimTime costs another round trip and only matters once there is nothing
      // left to claim today.
      const nextClaimAt = entitlement.amount > 0n ? null : await claim.nextClaimTime();

      return {
        verified: isWhitelisted,
        everVerified: isWhitelisted || lastAuthenticated > 0n,
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

    async board(): Promise<Standing | null> {
      if (!BOARD_ADDRESS) return null;

      const [roots, found] = await publicClient.readContract({
        address: BOARD_ADDRESS,
        abi: snarlBoardAbi,
        functionName: "page",
        args: [0n, BOARD_LIMIT],
      });

      // Names and weekly runs live in their own contracts, so they are joined on here
      // rather than duplicated into the board. Two more reads, both free.
      const [names, weeks] = await Promise.all([
        NAMES_ADDRESS && roots.length
          ? publicClient.readContract({
              address: NAMES_ADDRESS,
              abi: snarlNamesAbi,
              functionName: "namesOf",
              args: [roots],
            })
          : Promise.resolve([] as readonly string[]),
        WEEKLY_ADDRESS && roots.length
          ? publicClient.readContract({
              address: WEEKLY_ADDRESS,
              abi: weeklyPlayersAbi,
              functionName: "playersOf",
              args: [roots],
            })
          : Promise.resolve(
              [] as readonly { weeksEntered: number; streak: number; bestStreak: number }[],
            ),
      ]);

      const rows: BoardRow[] = roots.map((root, i) => ({
        root,
        name: names[i] ?? "",
        untangles: found[i]?.untangles ?? 0,
        distinct: found[i]?.distinct ?? 0,
        freed: found[i]?.freed ?? 0n,
        weeks: weeks[i]?.weeksEntered ?? 0,
        streak: weeks[i]?.streak ?? 0,
        bestStreak: weeks[i]?.bestStreak ?? 0,
      }));
      rows.sort((a, b) => b.untangles - a.untangles || b.distinct - a.distinct);

      // Who this wallet is on the board. Only knowable with one open, and the board is
      // worth reading without one.
      let root: Address | null = null;
      if (address && identitySdk) {
        const resolved = await identitySdk.getWhitelistedRoot(address);
        root = resolved.root === ZERO_ADDRESS ? null : (resolved.root as Address);
      }

      // Somebody who has claimed a name but not yet put a creature up has no row on the
      // board, and the screen still has to know who they are — otherwise it keeps
      // offering them a name they already took.
      let mine = rows.find((row) => row.root === root) ?? null;
      if (!mine && root) {
        const name = NAMES_ADDRESS
          ? await publicClient.readContract({
              address: NAMES_ADDRESS,
              abi: snarlNamesAbi,
              functionName: "nameOf",
              args: [root],
            })
          : "";
        mine = {
          root,
          name,
          untangles: 0,
          distinct: 0,
          freed: 0n,
          weeks: 0,
          streak: 0,
          bestStreak: 0,
        };
      }

      return { rows, mine, root };
    },

    async claimName(name: string) {
      if (!NAMES_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const hash = await walletClient.writeContract({
        address: NAMES_ADDRESS,
        abi: snarlNamesAbi,
        functionName: "claim",
        args: [name],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async proveUntangle(creature: number, xs: bigint[], ys: bigint[]) {
      if (!BOARD_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");

      const hash = await walletClient.writeContract({
        address: BOARD_ADDRESS,
        abi: snarlBoardAbi,
        functionName: "prove",
        args: [creature, xs, ys],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async backWeek(week: number, amount: bigint) {
      if (!WEEKLY_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");
      if (!onCelo) throw new Error("wrong-chain");

      // Approve only when the allowance will not cover it. Every avoided transaction is
      // a fee a player does not pay, and at Celo's floor the fee is the expensive part
      // of a small contribution.
      const allowance = await publicClient.readContract({
        address: contracts!.g$Contract,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, WEEKLY_ADDRESS],
      });
      if (allowance < amount) {
        const approval = await walletClient.writeContract({
          address: contracts!.g$Contract,
          abi: erc20Abi,
          functionName: "approve",
          args: [WEEKLY_ADDRESS, amount],
          account,
          chain: celo,
        });
        await publicClient.waitForTransactionReceipt({ hash: approval });
      }

      const hash = await walletClient.writeContract({
        address: WEEKLY_ADDRESS,
        abi: snarlWeeklyAbi,
        functionName: "fund",
        args: [week, amount],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async adminState(): Promise<AdminState | null> {
      if (!WEEKLY_ADDRESS) return null;
      const now = Math.floor(Date.now() / 1000);

      const [owner, weeksOpened, locked] = await Promise.all([
        publicClient.readContract({
          address: WEEKLY_ADDRESS,
          abi: snarlWeeklyAbi,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: WEEKLY_ADDRESS,
          abi: snarlWeeklyAbi,
          functionName: "weeksOpened",
        }),
        publicClient.readContract({
          address: WEEKLY_ADDRESS,
          abi: snarlWeeklyAbi,
          functionName: "locked",
        }),
      ]);

      // Only the weeks that are still worth acting on: the past is on the explorer.
      const upcoming = WEEK_PLANS.filter((plan) => plan.sweepableAt > now).slice(0, 8);
      const knots = await Promise.all(
        upcoming.map((plan) =>
          publicClient.readContract({
            address: WEEKLY_ADDRESS,
            abi: snarlWeeklyAbi,
            functionName: "knot",
            args: [plan.id],
          }),
        ),
      );

      const weeks: AdminWeek[] = upcoming.map((plan, i) => {
        const knot = knots[i];
        const opened = (knot?.closesAt ?? 0n) !== 0n;
        return {
          id: plan.id,
          label: plan.label,
          opened,
          settled: knot?.settled ?? false,
          pool: knot?.pool ?? 0n,
          entrants: knot?.entrants ?? 0,
          closesAt: new Date(plan.closesAt * 1000),
          due: !opened && now > plan.openBy && now < plan.closesAt,
          settleable: opened && !(knot?.settled ?? false) && now >= plan.closesAt,
        };
      });

      return {
        owner,
        isOwner: address !== null && owner.toLowerCase() === address.toLowerCase(),
        weeksOpened,
        locked,
        decimals,
        weeks,
      };
    },

    async openWeek(week: number) {
      if (!WEEKLY_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");
      if (!onCelo) throw new Error("wrong-chain");

      // The timestamps come from the generated table, never from the screen. A week
      // number can be opened once and never again, so a typo would burn it permanently.
      const plan = planFor(week);
      if (!plan) throw new Error("no such week in the table");

      const hash = await walletClient.writeContract({
        address: WEEKLY_ADDRESS,
        abi: snarlWeeklyAbi,
        functionName: "openKnot",
        args: [
          plan.id,
          WEEKLY_KNOT.edges,
          WEEKLY_KNOT.beads,
          BigInt(plan.closesAt),
          BigInt(plan.sweepableAt),
          0n,
        ],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async settleWeek(week: number) {
      if (!WEEKLY_ADDRESS) throw new Error("no-contract");
      const { address: account } = await ready();
      if (!walletClient) throw new Error("wallet not connected");
      if (!onCelo) throw new Error("wrong-chain");

      const hash = await walletClient.writeContract({
        address: WEEKLY_ADDRESS,
        abi: snarlWeeklyAbi,
        functionName: "settle",
        args: [week],
        account,
        chain: celo,
      });
      await publicClient.waitForTransactionReceipt({ hash });
    },

    async verificationLink(returnTo: string) {
      const { identitySdk: identity } = await ready();
      // GoodDollar's own hosted face check, on their domain. It asks the wallet to sign a
      // message first, so the player sees their wallet before they see a camera.
      return identity.generateFVLink(false, returnTo, CELO_ID);
    },
  };
}
