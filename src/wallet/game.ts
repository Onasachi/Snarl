import { erc20Abi, type PublicClient, type WalletClient } from "viem";
import { celo } from "viem/chains";
import { snarlGameAbi as abi } from "~/chain/snarlGame";
import type { GameRun } from "~/game/results";
import { emptySupplies, SUPPLIES, type SupplyCounts } from "~/game/supplies";
import type { Address, RescueOptions, RescueReceipt } from "./port";
import { confirmedTransactions } from "./transactions";

export interface GameMarket {
  address: Address | null;
  demo: boolean;
  supplies: SupplyCounts;
  sales: bigint;
  buyers: bigint;
  volume: bigint;
  runs: bigint;
  players: bigint;
}
export interface GameBoardRow {
  wallet: Address;
  runs: number;
  crossings: bigint;
  points: bigint;
}
export interface GamePort {
  readonly gameSupported: boolean;
  gameMarket(): Promise<GameMarket | null>;
  gameBoard(
    offset?: number,
  ): Promise<{ rows: GameBoardRow[]; count: number; mine: GameBoardRow | null } | null>;
  hasRecordedRun(id: Address): Promise<boolean>;
  recordGameRun(run: GameRun, options?: RescueOptions): Promise<RescueReceipt>;
  buySupply(item: number, options?: RescueOptions): Promise<RescueReceipt>;
}

export function liveGame(
  client: PublicClient,
  token: Address,
  current: () => Address | null,
  signer: () => Promise<WalletClient>,
): GamePort {
  const address = import.meta.env.VITE_SNARL_GAME as Address | undefined;
  const transact = confirmedTransactions(client);
  const checkedSigner = async (account: Address) => {
    const wallet = await signer();
    if (wallet.account?.address.toLowerCase() !== account.toLowerCase())
      throw new Error("wallet-changed");
    return wallet;
  };
  return {
    gameSupported: Boolean(address),
    async gameMarket() {
      if (!address) return null;
      const account = current();
      const [sales, buyers, volume, runs, players, counts] = await Promise.all([
        client.readContract({ address, abi, functionName: "sales" }),
        client.readContract({ address, abi, functionName: "buyers" }),
        client.readContract({ address, abi, functionName: "volume" }),
        client.readContract({ address, abi, functionName: "runCount" }),
        client.readContract({ address, abi, functionName: "playerCount" }),
        Promise.all(
          SUPPLIES.map((item) =>
            account
              ? client.readContract({
                  address,
                  abi,
                  functionName: "purchasedUnits",
                  args: [account, item.id],
                })
              : 0n,
          ),
        ),
      ]);
      return {
        address,
        demo: false,
        sales,
        buyers,
        volume,
        runs,
        players,
        supplies: { hint: Number(counts[0]), guide: Number(counts[1]), glimpse: Number(counts[2]) },
      };
    },
    async gameBoard(offset = 0) {
      if (!address) return null;
      const account = current();
      const [[wallets, records], count, own] = await Promise.all([
        client.readContract({ address, abi, functionName: "page", args: [BigInt(offset), 100n] }),
        client.readContract({ address, abi, functionName: "playerCount" }),
        account
          ? client.readContract({ address, abi, functionName: "players", args: [account] })
          : null,
      ]);
      return {
        rows: wallets.map((wallet, i) => ({ wallet, ...records[i]! })),
        count: Number(count),
        mine:
          own && account
            ? { wallet: account, runs: own[0], crossings: own[1], points: own[2] }
            : null,
      };
    },
    async hasRecordedRun(id) {
      const account = current();
      return address && account
        ? client.readContract({ address, abi, functionName: "recorded", args: [account, id] })
        : false;
    },
    async recordGameRun(run, options) {
      if (!address) throw new Error("no-contract");
      const account = current();
      if (!account) throw new Error("no-wallet");
      const key = `snarl.game.${address}.${account.toLowerCase()}.run.${run.id}`;
      // Pending transactions are resumed by transact; confirmed records need no second fee.
      if (await this.hasRecordedRun(run.id)) return { kind: "already-recorded" };
      const hash = await transact(
        key,
        async () => {
          const wallet = await checkedSigner(account);
          const { request } = await client.simulateContract({
            address,
            abi,
            functionName: "recordRun",
            args: [run],
            account,
          });
          await checkedSigner(account);
          return wallet.writeContract({ ...request, account, chain: celo });
        },
        options,
      );
      return { kind: "confirmed", hash };
    },
    async buySupply(item, options) {
      if (!address) throw new Error("no-contract");
      const product = SUPPLIES.find((p) => p.id === item);
      if (!product) throw new Error("invalid-item");
      const account = current();
      if (!account) throw new Error("no-wallet");
      const [price, units] = await client.readContract({
        address,
        abi,
        functionName: "offer",
        args: [item],
      });
      if (price !== product.price || units !== BigInt(product.units))
        throw new Error("offer-changed");
      const key = `snarl.game.${address}.${account.toLowerCase()}.buy.${item}`;
      const hash = await transact(
        key,
        async () => {
          const allowance = await client.readContract({
            address: token,
            abi: erc20Abi,
            functionName: "allowance",
            args: [account, address],
          });
          if (allowance < price)
            await transact(`${key}.approve`, async () =>
              (await checkedSigner(account)).writeContract({
                address: token,
                abi: erc20Abi,
                functionName: "approve",
                args: [address, price],
                account,
                chain: celo,
              }),
            );
          const wallet = await checkedSigner(account);
          const { request } = await client.simulateContract({
            address,
            abi,
            functionName: "buy",
            args: [item],
            account,
          });
          await checkedSigner(account);
          return wallet.writeContract({ ...request, account, chain: celo });
        },
        options,
      );
      return { kind: "confirmed", hash };
    },
  };
}

export function demoGame(
  account: Address,
  balance: () => bigint,
  spend: (amount: bigint) => void,
): GamePort {
  const key = "snarl.demo.game";
  const read = () => {
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? "null") as {
        runs: Record<string, GameRun>;
        supplies: SupplyCounts;
        sales: number;
        volume: string;
      } | null;
    } catch {
      return null;
    }
  };
  const state = () => read() ?? { runs: {}, supplies: emptySupplies(), sales: 0, volume: "0" };
  const save = (s: ReturnType<typeof state>) => sessionStorage.setItem(key, JSON.stringify(s));
  return {
    gameSupported: true,
    async gameMarket() {
      const s = state();
      return {
        demo: true,
        address: null,
        supplies: s.supplies,
        sales: BigInt(s.sales),
        buyers: s.sales ? 1n : 0n,
        volume: BigInt(s.volume),
        runs: BigInt(Object.keys(s.runs).length),
        players: Object.keys(s.runs).length ? 1n : 0n,
      };
    },
    async gameBoard() {
      const runs = Object.values(state().runs);
      const mine = {
        wallet: account,
        runs: runs.length,
        crossings: BigInt(runs.reduce((sum, r) => sum + r.crossings, 0)),
        points: BigInt(
          runs.reduce(
            (sum, r) => sum + r.crossings * 10 + (!r.assisted && r.moves <= r.par ? 25 : 0),
            0,
          ),
        ),
      };
      return { rows: runs.length ? [mine] : [], count: runs.length ? 1 : 0, mine };
    },
    async hasRecordedRun(id) {
      return Boolean(state().runs[id]);
    },
    async recordGameRun(run) {
      const s = state();
      if (s.runs[run.id]) return { kind: "already-recorded" };
      await new Promise((done) => setTimeout(done, 500));
      s.runs[run.id] = run;
      save(s);
      return { kind: "demo" };
    },
    async buySupply(item) {
      const product = SUPPLIES.find((p) => p.id === item);
      if (!product) throw new Error("invalid-item");
      if (balance() < product.price) throw new Error("insufficient-g$");
      const s = state();
      spend(product.price);
      s.supplies[product.key] += product.units;
      s.sales += 1;
      s.volume = String(BigInt(s.volume) + product.price);
      save(s);
      return { kind: "demo" };
    },
  };
}
