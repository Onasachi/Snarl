import { erc20Abi, type PublicClient, type WalletClient } from "viem";
import { celo } from "viem/chains";
import type { Address } from "~/wallet/port";
import { trailsAbi as abi } from "./abi";
import { type MarketPort, validDraft } from "./types";

export function liveMarket(
  client: PublicClient,
  token: Address,
  current: () => Address | null,
  signer: () => Promise<WalletClient>,
): MarketPort {
  const address = import.meta.env.VITE_SNARL_TRAILS as Address | undefined;
  const receipt = async (hash: Address) => {
    const result = await client.waitForTransactionReceipt({ hash });
    if (result.status !== "success")
      throw new Error("Transaction reverted. No purchase was recorded.");
  };
  return {
    async market(offset = 0) {
      if (!address) return null;
      const account = current();
      const stats = [
        "sales",
        "buyers",
        "verifiedBuyers",
        "creators",
        "volume",
        "creatorRevenue",
        "protocolRevenue",
        "repeatBuyers",
      ] as const;
      const [rows, count, credit, values] = await Promise.all([
        client.readContract({ address, abi, functionName: "page", args: [BigInt(offset), 20n] }),
        client.readContract({ address, abi, functionName: "count" }),
        account
          ? client.readContract({ address, abi, functionName: "credit", args: [account] })
          : 0n,
        Promise.all(
          stats.map((functionName) => client.readContract({ address, abi, functionName })),
        ),
      ]);
      const trails = await Promise.all(
        rows.map(async (row, i) => ({
          ...row,
          id: offset + i,
          owned:
            !!account &&
            (row.creator.toLowerCase() === account.toLowerCase() ||
              (await client.readContract({
                address,
                abi,
                functionName: "purchased",
                args: [account, BigInt(offset + i)],
              }))),
        })),
      );
      return {
        demo: false,
        address,
        trails,
        count: Number(count),
        credit,
        sales: values[0]!,
        buyers: values[1]!,
        verifiedBuyers: values[2]!,
        creators: values[3]!,
        volume: values[4]!,
        creatorRevenue: values[5]!,
        protocolRevenue: values[6]!,
        repeatBuyers: values[7]!,
      };
    },
    async buyTrail(trail) {
      if (!address) throw new Error("The trail market is not deployed yet.");
      const wallet = await signer();
      const account = current()!;
      const allowance = await client.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, address],
      });
      if (allowance < trail.price) {
        await receipt(
          await wallet.writeContract({
            account,
            chain: celo,
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [address, trail.price],
          }),
        );
      }
      // Recheck after approval: an account or chain change must never spend from a stale signer.
      const confirmed = await signer();
      if (current() !== account)
        throw new Error("Wallet changed. Please review the purchase again.");
      await receipt(
        await confirmed.writeContract({
          account,
          chain: celo,
          address,
          abi,
          functionName: "buy",
          args: [BigInt(trail.id), trail.price],
        }),
      );
    },
    async publishTrail(draft) {
      if (!address || !validDraft(draft))
        throw new Error("Check the title, price, and three different creatures.");
      const wallet = await signer();
      await receipt(
        await wallet.writeContract({
          account: current()!,
          chain: celo,
          address,
          abi,
          functionName: "publish",
          args: [draft.title.trim(), draft.price, draft.seed, draft.creatures, draft.palette],
        }),
      );
    },
    async withdrawTrailEarnings() {
      if (!address) throw new Error("The trail market is not deployed yet.");
      const wallet = await signer();
      await receipt(
        await wallet.writeContract({
          account: current()!,
          chain: celo,
          address,
          abi,
          functionName: "withdraw",
        }),
      );
    },
  };
}
