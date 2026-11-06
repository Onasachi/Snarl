import type { PublicClient, WalletClient } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { liveGame } from "~/wallet/game";

const account = "0x1111111111111111111111111111111111111111";
const game = "0x2222222222222222222222222222222222222222";
const token = "0x3333333333333333333333333333333333333333";
const hash = `0x${"a".repeat(64)}` as const;
const approvalHash = `0x${"b".repeat(64)}` as const;
const price = 100n * 10n ** 18n;
const run = {
  id: hash,
  level: 1,
  crossings: 4,
  moves: 2,
  par: 4,
  assisted: false,
  solutionHash: hash,
};

function setup(allowance = 0n) {
  const events: string[] = [];
  const read = vi.fn(
    async ({ functionName }: { functionName: string }): Promise<boolean | bigint | bigint[]> => {
      events.push(`read:${functionName}`);
      if (functionName === "recorded") return false;
      if (functionName === "offer") return [price, 5n];
      if (functionName === "allowance") return allowance;
      throw new Error(`Unexpected read: ${functionName}`);
    },
  );
  const simulate = vi.fn(async (request) => {
    events.push(`simulate:${request.functionName}`);
    return { request };
  });
  const write = vi.fn(async ({ functionName }) => {
    events.push(`write:${functionName}`);
    return functionName === "approve" ? approvalHash : hash;
  });
  const wait = vi.fn(async ({ hash: transactionHash }) => {
    events.push(transactionHash === approvalHash ? "confirmed:approve" : "confirmed:game");
    return { status: "success", transactionHash };
  });
  const signer = vi.fn(
    async () =>
      ({ account: { address: account }, writeContract: write }) as unknown as WalletClient,
  );
  const adapter = liveGame(
    {
      readContract: read,
      simulateContract: simulate,
      waitForTransactionReceipt: wait,
    } as unknown as PublicClient,
    token,
    () => account,
    signer,
  );
  return { adapter, read, simulate, write, wait, signer, events };
}

beforeEach(() => {
  vi.stubEnv("VITE_SNARL_GAME", game);
  const stored = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => stored.get(k) ?? null,
    setItem: (k: string, v: string) => stored.set(k, v),
    removeItem: (k: string) => stored.delete(k),
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("live gameplay and G$ purchases", () => {
  it("records with the connected wallet without reading a GoodDollar identity", async () => {
    const { adapter, events, write } = setup();
    await expect(adapter.recordGameRun(run)).resolves.toEqual({ kind: "confirmed", hash });
    expect(events).toEqual([
      "read:recorded",
      "simulate:recordRun",
      "write:recordRun",
      "confirmed:game",
    ]);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ account, args: [run] }));
  });
  it("does not charge gas again for an already-recorded result", async () => {
    const { adapter, read, write } = setup();
    read.mockResolvedValueOnce(true);
    await expect(adapter.recordGameRun(run)).resolves.toEqual({ kind: "already-recorded" });
    expect(write).not.toHaveBeenCalled();
  });
  it("confirms an exact-price allowance before submitting and confirming a purchase", async () => {
    const { adapter, events, write } = setup();
    await expect(adapter.buySupply(0)).resolves.toEqual({ kind: "confirmed", hash });
    expect(events).toEqual([
      "read:offer",
      "read:allowance",
      "write:approve",
      "confirmed:approve",
      "simulate:buy",
      "write:buy",
      "confirmed:game",
    ]);
    expect(write).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ address: token, args: [game, price] }),
    );
  });
  it("uses an existing allowance and rejects a reverted payment", async () => {
    const { adapter, wait, write } = setup(price);
    wait.mockResolvedValueOnce({ status: "reverted", transactionHash: hash });
    await expect(adapter.buySupply(0)).rejects.toThrow("transaction-reverted");
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(expect.objectContaining({ functionName: "buy" }));
  });
  it("stops if approval is rejected or the wallet changes", async () => {
    const { adapter, write, signer } = setup();
    write.mockRejectedValueOnce(new Error("4001"));
    await expect(adapter.buySupply(0)).rejects.toThrow("4001");
    expect(write).toHaveBeenCalledTimes(1);
    signer.mockResolvedValueOnce({
      account: { address: token },
      writeContract: write,
    } as unknown as WalletClient);
    await expect(adapter.recordGameRun(run)).rejects.toThrow("wallet-changed");
    expect(write).toHaveBeenCalledTimes(1);
  });
  it("refuses a contract offer that disagrees with the displayed price", async () => {
    const { adapter, read, write } = setup();
    read.mockResolvedValueOnce([price * 2n, 5n]);
    await expect(adapter.buySupply(0)).rejects.toThrow("offer-changed");
    expect(write).not.toHaveBeenCalled();
  });
});
