import { type PublicClient, parseAbi, type WalletClient, zeroAddress } from "viem";
import { celo } from "viem/chains";
import { snarlBoardAbi as abi } from "~/chain/snarlBoard";
import type { Address, RescueOptions, RescueReceipt } from "./port";

const identityAbi = parseAbi(["function getWhitelistedRoot(address) view returns (address)"]);

/** A retry after an RPC timeout must wait for the original transaction, not send another. */
export function rescueRecorder(
  client: PublicClient,
  board: Address,
  signer: () => Promise<WalletClient>,
) {
  const pending = new Map<string, Address>();
  const running = new Set<string>();

  const remember = (key: string, hash: Address | null) => {
    if (hash) pending.set(key, hash);
    else pending.delete(key);
    try {
      if (hash) sessionStorage.setItem(key, hash);
      else sessionStorage.removeItem(key);
    } catch {
      // The in-memory copy still protects retries when browser storage is unavailable.
    }
  };

  return async (
    creature: number,
    xs: bigint[],
    ys: bigint[],
    options?: RescueOptions,
  ): Promise<RescueReceipt> => {
    const wallet = await signer();
    const account = wallet.account?.address;
    if (!account) throw new Error("no-wallet");
    const key = `snarl.rescue.pending.${board.toLowerCase()}.${account.toLowerCase()}.${creature}`;
    if (running.has(key)) throw new Error("rescue-pending");
    running.add(key);
    try {
      let hash = pending.get(key);
      if (!hash) {
        try {
          const stored = sessionStorage.getItem(key);
          if (stored && /^0x[\da-f]{64}$/i.test(stored)) hash = stored as Address;
        } catch {
          // Continue with the chain read when storage is blocked.
        }
      }

      if (!hash) {
        // Use the registry the deployed Board actually enforces.
        const identity = await client.readContract({
          address: board,
          abi,
          functionName: "identity",
        });
        const root = await client.readContract({
          address: identity,
          abi: identityAbi,
          functionName: "getWhitelistedRoot",
          args: [account],
        });
        if (root === zeroAddress) throw new Error("not-verified");
        const record = await client.readContract({
          address: board,
          abi,
          functionName: "records",
          args: [root],
        });
        if ((record[3] & (1n << BigInt(creature))) !== 0n) return { kind: "already-recorded" };

        const { request } = await client.simulateContract({
          address: board,
          abi,
          functionName: "prove",
          args: [creature, xs, ys],
          account,
        });
        const confirmed = await signer();
        if (confirmed.account?.address.toLowerCase() !== account.toLowerCase())
          throw new Error("wallet-changed");
        hash = await confirmed.writeContract({ ...request, account, chain: celo });
        remember(key, hash);
      }

      options?.onSubmitted?.(hash);
      let cancelled = false;
      const receipt = await client.waitForTransactionReceipt({
        hash,
        onReplaced: ({ reason, transactionReceipt }) => {
          cancelled = reason !== "repriced";
          remember(key, cancelled ? null : transactionReceipt.transactionHash);
          options?.onSubmitted?.(transactionReceipt.transactionHash);
        },
      });
      remember(key, null);
      if (cancelled) throw new Error("transaction-cancelled");
      if (receipt.status !== "success") throw new Error("transaction-reverted");
      return { kind: "confirmed", hash: receipt.transactionHash };
    } finally {
      running.delete(key);
    }
  };
}
