import { useCallback, useEffect, useRef, useState } from "react";
import { createWallet, walletAvailable, wantsDemoWallet } from "./index";
import type { ClaimStatus, TipStatus, WalletAccount, WalletPort, WeekStatus } from "./port";

/** Set once the player has connected, so a reload or a verification trip can resume. */
const RESUME_KEY = "snarl.wallet.resume";
/** Set while the player is away at the face check, so they come back where they left. */
const RETURNING_KEY = "snarl.wallet.returning";

const remember = (value: boolean) => {
  try {
    if (value) sessionStorage.setItem(RESUME_KEY, "1");
    else sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Storage blocked: the player connects again, which is a small cost.
  }
};

const shouldResume = (): boolean => {
  try {
    return sessionStorage.getItem(RESUME_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * True exactly once, on the load after the player was sent to GoodDollar's face check.
 * Verification leaves the page entirely, so without this they would come back to the
 * splash screen and have to find their way to the pond again.
 *
 * It does not depend on what the provider puts in the return URL, which is theirs to
 * change.
 */
export const returningFromVerification = (): boolean => {
  try {
    const was = sessionStorage.getItem(RETURNING_KEY) === "1";
    if (was) sessionStorage.removeItem(RETURNING_KEY);
    return was;
  } catch {
    return false;
  }
};

export type WalletError = "no-wallet" | "rejected" | "failed";

const asError = (cause: unknown): WalletError => {
  const message = String((cause as { message?: string })?.message ?? cause);
  if (message.includes("no-wallet")) return "no-wallet";
  // EIP-1193: 4001 is the user saying no, which is not a failure.
  if (message.includes("4001") || /reject|denied/i.test(message)) return "rejected";
  return "failed";
};

/**
 * The game's whole relationship with a wallet. Nothing here runs until the player asks
 * for it: no provider is loaded, no account is requested, and no contract is read until
 * they tap Connect. A player who never does is never charged a byte for it.
 */
export function useWallet() {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [status, setStatus] = useState<ClaimStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WalletError | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [week, setWeek] = useState<WeekStatus | null>(null);
  const [tipsSupported, setTipsSupported] = useState(false);
  const port = useRef<WalletPort | null>(null);

  const load = useCallback(async (): Promise<WalletPort> => {
    port.current ??= await createWallet();
    return port.current;
  }, []);

  const refresh = useCallback(async () => {
    if (!port.current || !account) return;
    try {
      setStatus(await port.current.getClaimStatus());
    } catch {
      // A failed read leaves the last known state rather than blanking the card.
    }
  }, [account]);

  const connect = useCallback(
    async ({ silent = false } = {}) => {
      setBusy(true);
      setError(null);
      try {
        const wallet = await load();
        setTipsSupported(wallet.tipsSupported);
        const connected = await wallet.connect();
        setAccount(connected);
        remember(true);
        setStatus(await wallet.getClaimStatus());
      } catch (cause) {
        // Resuming is something this session decided to try, not something the player
        // just asked for. Failing at it quietly is better than greeting them with an
        // error about a wallet they never opened.
        if (!silent) setError(asError(cause));
        else remember(false);
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const claim = useCallback(async (): Promise<bigint | null> => {
    if (!port.current) return null;
    setBusy(true);
    setError(null);
    try {
      const { amount } = await port.current.claim();
      setStatus(await port.current.getClaimStatus());
      return amount;
    } catch (cause) {
      setError(asError(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  /** Reads one week of the Great Untangle. Null when no contract is configured. */
  const loadWeek = useCallback(async (id: number) => {
    if (!port.current) return;
    try {
      setWeek(await port.current.week(id));
    } catch {
      // A read that fails leaves the screen speaking for the player alone, which is what
      // it does with no contract at all.
    }
  }, []);

  const enterWeek = useCallback(async (id: number, xs: bigint[], ys: bigint[]) => {
    if (!port.current) return false;
    setBusy(true);
    setError(null);
    try {
      await port.current.enterWeek(id, xs, ys);
      setWeek(await port.current.week(id));
      return true;
    } catch (cause) {
      setError(asError(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const collectWeek = useCallback(async (id: number): Promise<bigint | null> => {
    if (!port.current) return null;
    setBusy(true);
    setError(null);
    try {
      const { amount } = await port.current.collectWeek(id);
      setWeek(await port.current.week(id));
      setStatus(await port.current.getClaimStatus());
      return amount;
    } catch (cause) {
      setError(asError(cause));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * What is waiting behind a gift link. Loads the wallet module but connects nothing:
   * someone opening their first link has no wallet yet and should still see the amount.
   */
  const loadTip = useCallback(
    async (key: string): Promise<TipStatus | null> => {
      try {
        const wallet = await load();
        setTipsSupported(wallet.tipsSupported);
        return await wallet.tip(key);
      } catch {
        return null;
      }
    },
    [load],
  );

  /** Puts G$ behind a link. Two transactions: the escrow has to be allowed to pull it. */
  const sendTip = useCallback(async (key: string, amount: bigint): Promise<boolean> => {
    if (!port.current) return false;
    setBusy(true);
    setError(null);
    try {
      await port.current.sendTip(key, amount);
      setStatus(await port.current.getClaimStatus());
      return true;
    } catch (cause) {
      setError(asError(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const takeTip = useCallback(
    async (key: string, how: "openTip" | "reclaimTip"): Promise<bigint | null> => {
      if (!port.current) return null;
      setBusy(true);
      setError(null);
      try {
        const { amount } = await port.current[how](key);
        setStatus(await port.current.getClaimStatus());
        return amount;
      } catch (cause) {
        setError(asError(cause));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const openTip = useCallback((key: string) => takeTip(key, "openTip"), [takeTip]);
  const reclaimTip = useCallback((key: string) => takeTip(key, "reclaimTip"), [takeTip]);

  /**
   * Hands the player to GoodDollar's own face check and leaves the page. They come back
   * to the same URL, and the status read on their return is what decides anything.
   */
  const verify = useCallback(async () => {
    if (!port.current) return;
    setBusy(true);
    setError(null);
    try {
      const link = await port.current.verificationLink(window.location.href);
      remember(true);
      try {
        sessionStorage.setItem(RETURNING_KEY, "1");
      } catch {
        // Without storage they land on the splash instead. Not worth blocking the check.
      }
      window.location.assign(link);
    } catch (cause) {
      setError(asError(cause));
      setBusy(false);
    }
  }, []);

  // Is there anything to connect to at all? Checked once, lazily, and never acted on.
  useEffect(() => {
    let live = true;
    void walletAvailable().then((found) => {
      if (live) setAvailable(found);
    });
    return () => {
      live = false;
    };
  }, []);

  // Coming back from the face check, or reloading after connecting. Reconnecting is the
  // player's own choice from earlier in this session, so it does not prompt from nothing.
  useEffect(() => {
    if (!shouldResume() || account) return;
    const returned = new URLSearchParams(window.location.search).has("demo-verified");
    void (async () => {
      if (returned && wantsDemoWallet()) {
        const { markDemoVerified } = await import("./demo");
        markDemoVerified();
        const url = new URL(window.location.href);
        url.searchParams.delete("demo-verified");
        window.history.replaceState({}, "", url);
      }
      await connect({ silent: true });
    })();
  }, [account, connect]);

  return {
    account,
    status,
    busy,
    error,
    available,
    week,
    connect,
    claim,
    verify,
    refresh,
    loadWeek,
    enterWeek,
    collectWeek,
    tipsSupported,
    loadTip,
    sendTip,
    openTip,
    reclaimTip,
  };
}
