import type { PublicClient } from "viem";
import type { Address, RescueOptions } from "./port";

/** Retry submitted transactions by hash, including after a reload. */
export function confirmedTransactions(client: PublicClient) {
  const pending = new Map<string, Address>();
  const running = new Set<string>();
  const save = (key: string, hash: Address | null) => {
    if (hash) pending.set(key, hash);
    else pending.delete(key);
    try {
      if (hash) sessionStorage.setItem(key, hash);
      else sessionStorage.removeItem(key);
    } catch {
      /* in-memory fallback */
    }
  };
  return async (
    key: string,
    send: () => Promise<Address>,
    options?: RescueOptions,
  ): Promise<Address> => {
    if (running.has(key)) throw new Error("transaction-pending");
    running.add(key);
    try {
      let hash = pending.get(key);
      if (!hash)
        try {
          const stored = sessionStorage.getItem(key);
          if (stored && /^0x[\da-f]{64}$/i.test(stored)) hash = stored as Address;
        } catch {
          /* storage unavailable */
        }
      if (!hash) {
        hash = await send();
        save(key, hash);
      }
      options?.onSubmitted?.(hash);
      let cancelled = false;
      const receipt = await client.waitForTransactionReceipt({
        hash,
        onReplaced: ({ reason, transactionReceipt }) => {
          cancelled = reason !== "repriced";
          save(key, cancelled ? null : transactionReceipt.transactionHash);
          options?.onSubmitted?.(transactionReceipt.transactionHash);
        },
      });
      save(key, null);
      if (cancelled) throw new Error("transaction-cancelled");
      if (receipt.status !== "success") throw new Error("transaction-reverted");
      return receipt.transactionHash;
    } finally {
      running.delete(key);
    }
  };
}
