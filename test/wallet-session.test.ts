import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ClaimStatus, claimCardState, type WalletAccount } from "~/wallet/port";
import { useWallet } from "~/wallet/useWallet";

const adapter = vi.hoisted(() => ({
  createWallet: vi.fn(),
  walletAvailable: vi.fn(async () => true),
}));
vi.mock("~/wallet/index", () => ({
  ...adapter,
  boardAvailable: () => false,
  emailLoginOffered: () => false,
  wantsDemoWallet: () => false,
}));

const account: WalletAccount = {
  address: "0x0000000000000000000000000000000000000001",
  chainId: 42220,
  onCelo: true,
  label: "test wallet",
};
const status = (verified: boolean): ClaimStatus => ({
  verified,
  everVerified: verified,
  entitlement: verified ? 100n : 0n,
  nextClaimAt: null,
  balance: 0n,
  decimals: 18,
});

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

let wallet: ReturnType<typeof useWallet>;
function Harness() {
  wallet = useWallet();
  return null;
}

describe("GoodDollar wallet session", () => {
  let renderer: ReactTestRenderer;
  let accountChanged: () => void;
  let readStatus: ReturnType<typeof vi.fn<() => Promise<ClaimStatus>>>;
  let verificationLink: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;
  let page: EventTarget & { visibilityState: string };

  beforeEach(async () => {
    vi.useFakeTimers();
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });
    navigate = vi.fn();
    vi.stubGlobal(
      "window",
      Object.assign(new EventTarget(), {
        location: { href: "https://snarl.test/", search: "", assign: navigate },
      }),
    );
    page = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("document", page);
    readStatus = vi.fn(async () => status(false));
    verificationLink = vi.fn(async () => "https://verify.test/");
    adapter.createWallet.mockResolvedValue({
      connect: async () => account,
      disconnect: async () => {},
      getClaimStatus: readStatus,
      verificationLink,
      watchAccount: (listener: () => void) => {
        accountChanged = listener;
        return () => {};
      },
    });
    await act(async () => {
      renderer = create(createElement(Harness));
    });
    await act(async () => {
      await wallet.connect();
    });
  });

  afterEach(async () => {
    await act(async () => renderer.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("recognises an existing verified identity on connection", async () => {
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      await wallet.connect();
    });
    expect(claimCardState(wallet.account, wallet.status)).toBe("ready");
    expect(verificationLink).not.toHaveBeenCalled();
  });

  it("refreshes after verification in another tab, coalescing return events", async () => {
    expect(wallet.status?.verified).toBe(false);
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(wallet.status?.verified).toBe(true);
    expect(verificationLink).not.toHaveBeenCalled();
  });

  it.each(["pageshow", "online"])("rechecks on %s without reconnecting", async (event) => {
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      window.dispatchEvent(new Event(event));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(wallet.status?.verified).toBe(true);
  });

  it("waits until the page is visible to refresh", async () => {
    page.visibilityState = "hidden";
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(readStatus).toHaveBeenCalledTimes(1);
    page.visibilityState = "visible";
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(wallet.status?.verified).toBe(true);
  });

  it("rechecks before signing a verification link and skips already verified wallets", async () => {
    // The sheet was opened while unverified, but GoodDollar has since verified them.
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      await wallet.verify();
    });
    expect(wallet.status?.verified).toBe(true);
    expect(verificationLink).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(wallet.busy).toBe(false);
  });

  it("only redirects when a fresh check confirms verification is needed", async () => {
    await act(async () => {
      await wallet.verify();
    });
    expect(readStatus).toHaveBeenCalledTimes(2);
    expect(verificationLink).toHaveBeenCalledWith("https://snarl.test/");
    expect(navigate).toHaveBeenCalledWith("https://verify.test/");
    expect(sessionStorage.getItem("snarl.wallet.returning")).toBe("1");
    expect(sessionStorage.getItem("snarl.demo.wallet.returning")).toBeNull();
  });

  it("clears stale unverified status on RPC failure and never opens verification", async () => {
    readStatus.mockRejectedValue(new Error("RPC unavailable"));
    await act(async () => {
      await wallet.verify();
    });
    expect(wallet.status).toBeNull();
    expect(wallet.statusError).toBe(true);
    expect(claimCardState(wallet.account, wallet.status)).toBe("checking");
    expect(verificationLink).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(wallet.checkingStatus).toBe(false);
    readStatus.mockResolvedValue(status(true));
    await act(async () => {
      await wallet.refresh();
    });
    expect(wallet.statusError).toBe(false);
    expect(wallet.status?.verified).toBe(true);
  });

  it("ignores an older unverified response arriving after a successful refresh", async () => {
    const old = deferred<ClaimStatus>();
    readStatus.mockReturnValueOnce(old.promise).mockResolvedValue(status(true));
    let pending!: ReturnType<typeof wallet.refresh>;
    await act(async () => {
      pending = wallet.refresh();
    });
    expect(wallet.checkingStatus).toBe(true);
    await act(async () => {
      await wallet.refresh();
      old.resolve(status(false));
      expect(await pending).toBeNull();
    });
    expect(wallet.status?.verified).toBe(true);
    expect(wallet.checkingStatus).toBe(false);
  });

  it("drops pending identity results when the wallet changes", async () => {
    const old = deferred<ClaimStatus>();
    readStatus.mockReturnValueOnce(old.promise);
    let pending!: ReturnType<typeof wallet.verify>;
    await act(async () => {
      pending = wallet.verify();
    });
    await act(async () => {
      accountChanged();
      old.resolve(status(false));
      await pending;
    });
    expect(wallet.account).toBeNull();
    expect(wallet.status).toBeNull();
    expect(wallet.checkingStatus).toBe(false);
    expect(verificationLink).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
