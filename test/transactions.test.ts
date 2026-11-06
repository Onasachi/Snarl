import type { PublicClient } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmedTransactions } from "~/wallet/transactions";

const hash = `0x${"a".repeat(64)}` as const;
const replacement = `0x${"b".repeat(64)}` as const;
beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
    removeItem: (k: string) => stored.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Celo transaction confirmation", () => {
  it("never treats a reverted payment as a purchase", async () => {
    const wait = vi.fn(async () => ({ status: "reverted", transactionHash: hash }));
    const submit = confirmedTransactions({
      waitForTransactionReceipt: wait,
    } as unknown as PublicClient);
    await expect(submit("payment", async () => hash)).rejects.toThrow("transaction-reverted");
    expect(sessionStorage.getItem("payment")).toBeNull();
  });
  it("resumes a timed-out payment by hash after a reload without asking for another payment", async () => {
    const wait = vi
      .fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce({ status: "success", transactionHash: hash });
    const client = { waitForTransactionReceipt: wait } as unknown as PublicClient;
    const send = vi.fn(async () => hash);
    await expect(confirmedTransactions(client)("payment", send)).rejects.toThrow("timeout");
    expect(sessionStorage.getItem("payment")).toBe(hash);
    expect(await confirmedTransactions(client)("payment", send)).toBe(hash);
    expect(send).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("payment")).toBeNull();
  });
  it("does not send a second transaction on a double tap", async () => {
    let finish!: (value: unknown) => void;
    const wait = vi.fn(
      () =>
        new Promise((done) => {
          finish = done;
        }),
    );
    const send = vi.fn(async () => hash);
    const submit = confirmedTransactions({
      waitForTransactionReceipt: wait,
    } as unknown as PublicClient);
    const first = submit("payment", send);
    await expect(submit("payment", send)).rejects.toThrow("transaction-pending");
    finish({ status: "success", transactionHash: hash });
    await first;
    expect(send).toHaveBeenCalledTimes(1);
  });
  it.each(["cancelled", "replaced"])(
    "does not count a %s transaction as success",
    async (reason) => {
      const wait = vi.fn(async ({ onReplaced }) => {
        onReplaced({ reason, transactionReceipt: { transactionHash: replacement } });
        return { status: "success", transactionHash: replacement };
      });
      const submit = confirmedTransactions({
        waitForTransactionReceipt: wait,
      } as unknown as PublicClient);
      await expect(submit("payment", async () => hash)).rejects.toThrow("transaction-cancelled");
      expect(sessionStorage.getItem("payment")).toBeNull();
    },
  );
  it("follows a repriced transaction to its final receipt", async () => {
    const wait = vi.fn(async ({ onReplaced }) => {
      onReplaced({ reason: "repriced", transactionReceipt: { transactionHash: replacement } });
      return { status: "success", transactionHash: replacement };
    });
    const submit = confirmedTransactions({
      waitForTransactionReceipt: wait,
    } as unknown as PublicClient);
    const submitted = vi.fn();
    expect(await submit("payment", async () => hash, { onSubmitted: submitted })).toBe(replacement);
    expect(submitted.mock.calls).toEqual([[hash], [replacement]]);
  });
});
