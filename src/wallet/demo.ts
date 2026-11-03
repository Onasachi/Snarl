import type { ClaimStatus, TipStatus, WalletAccount, WalletPort, WeekStatus } from "./port";

/**
 * A wallet that holds nothing and moves nothing, so every state of the claim card can be
 * driven and looked at without a real wallet, a real identity or a single real
 * transaction. Development builds only — `createWallet` will not load this in production.
 *
 * It takes the real round trip seriously: verification really does leave the page and come
 * back with a query parameter, because that return trip is the part most likely to break.
 */

const DEMO_ADDRESS = "0x5ab1ec0de0000000000000000000000000000001" as const;
const DECIMALS = 18;
const DAILY = 152_370_000_000_000_000_000n;
const VERIFIED_KEY = "snarl.demo.verified";
const ENTERED_KEY = "snarl.demo.weekEntered";
const COLLECTED_KEY = "snarl.demo.weekCollected";
/** A pool with people already in it, so the screen has something to show. */
const DEMO_POOL = 120_000n * 10n ** 18n;
const DEMO_ENTRANTS = 1283;
const CLAIMED_KEY = "snarl.demo.claimedAt";
const BALANCE_KEY = "snarl.demo.balance";
/** One entry per gift key, so a link can be escrowed, opened and taken back. */
const TIP_KEY = (key: string) => `snarl.demo.tip.${key.slice(0, 12)}`;
const DEMO_SENDER = "0x5ab1ec0de0000000000000000000000000000002" as const;

const read = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the demo just forgets between reloads.
  }
};

const midnight = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
};

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

export const markDemoVerified = (): void => write(VERIFIED_KEY, "yes");

export function createDemoWallet(): WalletPort {
  return {
    tipsSupported: true,

    async connect(): Promise<WalletAccount> {
      await sleep(400);
      return { address: DEMO_ADDRESS, chainId: 42220, label: "the demo wallet" };
    },

    async getClaimStatus(): Promise<ClaimStatus> {
      await sleep(250);
      const verified = read(VERIFIED_KEY) === "yes";
      const claimedToday = read(CLAIMED_KEY) !== null;
      return {
        verified,
        entitlement: verified && !claimedToday ? DAILY : 0n,
        nextClaimAt: claimedToday ? midnight() : null,
        balance: BigInt(read(BALANCE_KEY) ?? "0"),
        decimals: DECIMALS,
      };
    },

    async claim() {
      await sleep(600);
      const balance = BigInt(read(BALANCE_KEY) ?? "0") + DAILY;
      write(BALANCE_KEY, balance.toString());
      write(CLAIMED_KEY, Date.now().toString());
      return { amount: DAILY };
    },

    async week(id: number): Promise<WeekStatus | null> {
      await sleep(250);
      const entered = read(ENTERED_KEY) === String(id);
      const entrants = DEMO_ENTRANTS + (entered ? 1 : 0);
      return {
        pool: DEMO_POOL,
        entrants,
        closesAt: midnight(),
        // The real contract only settles once the week is over. The demo settles as soon
        // as you have entered, because the point of it is to be able to look at every
        // state without waiting until Sunday.
        settled: entered,
        share: DEMO_POOL / BigInt(entrants),
        entered,
        collected: read(COLLECTED_KEY) === String(id),
        decimals: DECIMALS,
      };
    },

    async enterWeek(id: number) {
      await sleep(700);
      write(ENTERED_KEY, String(id));
    },

    async collectWeek(id: number) {
      await sleep(700);
      const amount = DEMO_POOL / BigInt(DEMO_ENTRANTS + 1);
      write(COLLECTED_KEY, String(id));
      write(BALANCE_KEY, (BigInt(read(BALANCE_KEY) ?? "0") + amount).toString());
      return { amount };
    },

    async tip(key: string): Promise<TipStatus | null> {
      await sleep(200);
      const stored = read(TIP_KEY(key));
      if (!stored) return null;
      const { from, amount, opened, reclaimableAt } = JSON.parse(stored) as {
        from: string;
        amount: string;
        opened: boolean;
        reclaimableAt: number;
      };
      return {
        from: from as `0x${string}`,
        amount: BigInt(amount),
        decimals: DECIMALS,
        opened,
        reclaimableAt: new Date(reclaimableAt),
      };
    },

    async sendTip(key: string, amount: bigint) {
      await sleep(900);
      const balance = BigInt(read(BALANCE_KEY) ?? "0");
      if (balance < amount) throw new Error("not enough G$");
      write(BALANCE_KEY, (balance - amount).toString());
      write(
        TIP_KEY(key),
        JSON.stringify({
          from: DEMO_ADDRESS,
          amount: amount.toString(),
          opened: false,
          // Already reclaimable, so the demo can look at taking one back without
          // waiting a month for it.
          reclaimableAt: Date.now() - 1000,
        }),
      );
    },

    async openTip(key: string) {
      await sleep(800);
      const stored = read(TIP_KEY(key));
      if (!stored) throw new Error("no gift");
      const gift = JSON.parse(stored) as { amount: string; opened: boolean };
      if (gift.opened) throw new Error("already opened");
      const amount = BigInt(gift.amount);

      // A link opened in this browser came from somewhere else, so the money did not
      // leave this demo wallet's balance — it arrives in it.
      write(
        TIP_KEY(key),
        JSON.stringify({ ...JSON.parse(stored), from: DEMO_SENDER, opened: true }),
      );
      write(BALANCE_KEY, (BigInt(read(BALANCE_KEY) ?? "0") + amount).toString());
      return { amount };
    },

    async reclaimTip(key: string) {
      await sleep(800);
      const stored = read(TIP_KEY(key));
      if (!stored) throw new Error("no gift");
      const gift = JSON.parse(stored) as { amount: string; opened: boolean };
      if (gift.opened) throw new Error("already opened");
      const amount = BigInt(gift.amount);

      write(TIP_KEY(key), JSON.stringify({ ...JSON.parse(stored), opened: true }));
      write(BALANCE_KEY, (BigInt(read(BALANCE_KEY) ?? "0") + amount).toString());
      return { amount };
    },

    async verificationLink(returnTo: string) {
      await sleep(200);
      const url = new URL(returnTo);
      url.searchParams.set("demo-verified", "1");
      return url.toString();
    },
  };
}
