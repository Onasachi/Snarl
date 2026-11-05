import type { Address } from "~/wallet/port";
import { type MarketPort, type Trail, validDraft } from "./types";

const KEY = "snarl.demo.trails.v1";
const maker = "0x5ab1ec0de0000000000000000000000000000002" as const;
export function demoMarket(
  account: Address,
  balance: () => bigint,
  spend: (amount: bigint) => void,
  verified: () => boolean,
): MarketPort {
  const samples: Trail[] = [
    {
      id: 0,
      title: "Where the lilies sleep",
      price: 60n * 10n ** 18n,
      seed: 2741,
      creatures: [1, 3, 6],
      palette: 1,
      creator: maker,
      root: maker,
      active: true,
      owned: false,
    },
    {
      id: 1,
      title: "Three tiny adventures",
      price: 40n * 10n ** 18n,
      seed: 8128,
      creatures: [0, 2, 8],
      palette: 2,
      creator: maker,
      root: maker,
      active: true,
      owned: false,
    },
  ];
  let trails = samples;
  try {
    const data = sessionStorage.getItem(KEY);
    if (data)
      trails = JSON.parse(data).map((t: Trail & { price: string }) => ({
        ...t,
        price: BigInt(t.price),
      }));
  } catch {
    /* isolated demo */
  }
  const save = () =>
    sessionStorage.setItem(
      KEY,
      JSON.stringify(trails, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
    );
  return {
    async market() {
      const sold = trails.filter((t) => t.owned && t.creator !== account);
      const volume = sold.reduce((n, t) => n + t.price, 0n);
      return {
        demo: true,
        address: null,
        trails: [...trails],
        count: trails.length,
        credit: 0n,
        sales: BigInt(sold.length),
        buyers: sold.length ? 1n : 0n,
        repeatBuyers: sold.length > 1 ? 1n : 0n,
        verifiedBuyers: sold.length && verified() ? 1n : 0n,
        creators: BigInt(new Set(trails.map((t) => t.creator)).size),
        volume,
        creatorRevenue: (volume * 9n) / 10n,
        protocolRevenue: volume / 10n,
      };
    },
    async buyTrail(trail) {
      const found = trails.find((t) => t.id === trail.id);
      if (!found || found.owned || !found.active || found.creator === account)
        throw new Error("Trail is unavailable.");
      if (balance() < found.price) throw new Error("Not enough demo G$.");
      spend(found.price);
      found.owned = true;
      save();
    },
    async publishTrail(draft) {
      if (!verified()) throw new Error("Verify with GoodDollar before publishing.");
      if (!validDraft(draft)) throw new Error("Check the trail details.");
      trails = [
        ...trails,
        { ...draft, id: trails.length, creator: account, root: account, owned: true, active: true },
      ];
      save();
    },
    async withdrawTrailEarnings() {
      throw new Error("No demo earnings to withdraw.");
    },
  };
}
