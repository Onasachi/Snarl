import { useCallback, useEffect, useRef, useState } from "react";
import type { GameRun } from "~/game/results";
import type { Trail, TrailDraft } from "~/market/types";
import {
  boardAvailable,
  createWallet,
  emailLoginOffered,
  gameAvailable,
  walletAvailable,
  wantsDemoWallet,
} from "./index";
import type {
  AdminState,
  ClaimStatus,
  RescueOptions,
  RescueReceipt,
  Standing,
  TipStatus,
  WalletAccount,
  WalletPort,
  WeekStatus,
} from "./port";
import { SOCIAL_ID } from "./social";

/** Set once the player has connected, so a reload or a verification trip can resume. */
const RESUME_KEY = wantsDemoWallet() ? "snarl.demo.wallet.resume" : "snarl.wallet.resume";
/** Set while the player is away at the face check, so they come back where they left. */
const RETURNING_KEY = wantsDemoWallet() ? "snarl.demo.wallet.returning" : "snarl.wallet.returning";

/**
 * Which door was used, so a reload comes back through the same one.
 *
 * It matters more than it looks now that the game is gated: somebody who logged in with
 * an email and then reloaded would be taken for a wallet user, found not to have one,
 * and left outside a door they had already come through.
 */
const remember = (walletId?: string) => {
  try {
    sessionStorage.setItem(RESUME_KEY, walletId ?? "1");
  } catch {
    // Storage blocked: the player connects again, which is a small cost.
  }
};

const forget = () => {
  try {
    sessionStorage.removeItem(RESUME_KEY);
  } catch {
    // Nothing to forget if nothing could be stored.
  }
};

/** The door to come back through, or undefined for "whatever the browser has". */
const rememberedWallet = (): string | undefined => {
  try {
    const stored = sessionStorage.getItem(RESUME_KEY);
    return stored && stored !== "1" ? stored : undefined;
  } catch {
    return undefined;
  }
};

const shouldResume = (): boolean => {
  try {
    return sessionStorage.getItem(RESUME_KEY) !== null;
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

export type WalletError =
  | "wallet-changed"
  | "no-wallet"
  | "wrong-chain"
  | "rejected"
  | "not-verified"
  | "insufficient-gas"
  | "reverted"
  | "failed";

const asError = (cause: unknown): WalletError => {
  // The screen can only ever say one of four things, and "that did not go through" is a
  // poor sentence to debug from — as a login that succeeded and then dropped its own
  // provider proved. The real cause goes to the console, where it can be read.
  console.error("[snarl wallet]", cause);

  const message = String((cause as { message?: string })?.message ?? cause);
  if (message.includes("wallet-changed")) return "wallet-changed";
  if (message.includes("no-wallet")) return "no-wallet";
  if (message.includes("wrong-chain")) return "wrong-chain";
  if (/not-verified|NotVerified/.test(message)) return "not-verified";
  if (/insufficient funds|insufficient-gas/i.test(message)) return "insufficient-gas";
  if (message.includes("transaction-reverted")) return "reverted";
  // EIP-1193: 4001 is the user saying no, which is not a failure.
  if (message.includes("4001") || /reject|denied|transaction-cancelled/i.test(message))
    return "rejected";
  return "failed";
};

/**
 * The game's whole relationship with a wallet. Nothing here runs until the player asks
 * for it: no provider is loaded, no account is requested, and no contract is read until
 * they tap Connect. A player who never does is never charged a byte for it.
 */
export function useWallet() {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [status, setStatus] = useState<ClaimStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<WalletError | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [week, setWeek] = useState<WeekStatus | null>(null);
  const [tipsSupported, setTipsSupported] = useState(false);
  const [boardSupported, setBoardSupported] = useState(boardAvailable);
  const [gameSupported] = useState(gameAvailable);
  const [standing, setStanding] = useState<Standing | null>(null);
  const [admin, setAdmin] = useState<AdminState | null>(null);
  const generation = useRef(0);
  const statusRequest = useRef(0);
  const boardRequest = useRef(0);
  const proving = useRef(false);
  const port = useRef<WalletPort | null>(null);
  const loadingPort = useRef<Promise<WalletPort> | null>(null);

  const load = useCallback(async (): Promise<WalletPort> => {
    if (port.current) return port.current;
    // Featured trails and a resumed login can request the adapter together.
    // Both must receive the same instance so a late read cannot replace a connected wallet.
    loadingPort.current ??= createWallet();
    try {
      port.current = await loadingPort.current;
      return port.current;
    } finally {
      loadingPort.current = null;
    }
  }, []);

  // Read failures are unknown status, never evidence that a face check is needed.
  // Only the latest read for the current account may update the UI or allow a redirect.
  const readStatus = useCallback(async (wallet: WalletPort): Promise<ClaimStatus | null> => {
    const version = generation.current;
    const request = ++statusRequest.current;
    const current = () => version === generation.current && request === statusRequest.current;
    setCheckingStatus(true);
    setStatusError(false);
    try {
      const result = await wallet.getClaimStatus();
      if (!current()) return null;
      setStatus(result);
      return result;
    } catch {
      if (current()) {
        setStatus(null);
        setStatusError(true);
      }
      return null;
    } finally {
      if (current()) setCheckingStatus(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!port.current || !account) return null;
    return readStatus(port.current);
  }, [account, readStatus]);

  /** The wallets worth offering a choice between. Empty when there is no choice. */
  const listWallets = useCallback(async () => {
    try {
      return await (await load()).listWallets();
    } catch {
      return [];
    }
  }, [load]);

  const connect = useCallback(
    async ({ silent = false, walletId }: { silent?: boolean; walletId?: string } = {}) => {
      const version = ++generation.current;
      setBusy(true);
      setCheckingStatus(false);
      setError(null);
      try {
        const wallet = await load();
        setTipsSupported(wallet.tipsSupported);
        setBoardSupported(wallet.boardSupported);
        const connected = await wallet.connect(walletId);
        if (version !== generation.current) return;
        setAccount(connected);
        setStanding(null);
        remember(walletId);
        setStatus(null);
        setStatusError(false);
        await readStatus(wallet);
      } catch (cause) {
        // Resuming is something this session decided to try, not something the player
        // just asked for. Failing at it quietly is better than greeting them with an
        // error about a wallet they never opened.
        if (!silent) setError(asError(cause));
        else forget();
      } finally {
        if (version === generation.current) setBusy(false);
      }
    },
    [load, readStatus],
  );

  /** Ends the session here and wherever it came from, and forgets the door. */
  const disconnect = useCallback(async () => {
    ++generation.current;
    setBusy(true);
    try {
      await port.current?.disconnect();
    } catch {
      // A session that will not close cleanly is still closed as far as this app goes.
    } finally {
      forget();
      setAccount(null);
      setStatus(null);
      setCheckingStatus(false);
      setWeek(null);
      setStanding(null);
      setAdmin(null);
      setBusy(false);
    }
  }, []);

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

  /** The pool as whoever keeps it running sees it. Readable without a wallet. */
  const loadAdmin = useCallback(async () => {
    try {
      const wallet = await load();
      setAdmin(await wallet.adminState());
    } catch {
      setAdmin(null);
    }
  }, [load]);

  const runAdmin = useCallback(
    async (what: "openWeek" | "settleWeek", week: number): Promise<boolean> => {
      if (!port.current) return false;
      setBusy(true);
      setError(null);
      try {
        await port.current[what](week);
        setAdmin(await port.current.adminState());
        return true;
      } catch (cause) {
        setError(asError(cause));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /** The email door, which is Web3Auth under a plainer name. */
  const connectWithEmail = useCallback(
    () => connect({ walletId: SOCIAL_ID }),
    // `connect` is stable; naming it here keeps the dependency honest.
    [connect],
  );

  const openWeek = useCallback((week: number) => runAdmin("openWeek", week), [runAdmin]);
  const settleWeek = useCallback((week: number) => runAdmin("settleWeek", week), [runAdmin]);

  /** Puts G$ into a week's pool. True once it is actually in. */
  const backWeek = useCallback(async (id: number, amount: bigint): Promise<boolean> => {
    if (!port.current) return false;
    setBusy(true);
    setError(null);
    try {
      await port.current.backWeek(id, amount);
      setWeek(await port.current.week(id));
      setStatus(await port.current.getClaimStatus());
      return true;
    } catch (cause) {
      setError(asError(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * Reads the board. No wallet needed: a leaderboard that will not show itself without
   * one is not a leaderboard, it is a membership card.
   */
  const loadBoard = useCallback(async () => {
    const version = generation.current;
    const request = ++boardRequest.current;
    try {
      const wallet = await load();
      const result = await wallet.board();
      if (version !== generation.current || request !== boardRequest.current) return;
      setBoardSupported(wallet.boardSupported);
      setStanding(result);
    } catch {
      // A failed read leaves the screen saying it cannot reach the board, which is true.
      if (version === generation.current && request === boardRequest.current) setStanding(null);
    }
  }, [load]);

  const claimName = useCallback(async (name: string): Promise<boolean> => {
    if (!port.current) return false;
    setBusy(true);
    setError(null);
    try {
      await port.current.claimName(name);
      setStanding(await port.current.board());
      return true;
    } catch (cause) {
      setError(asError(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const proveUntangle = useCallback(
    async (
      creature: number,
      xs: bigint[],
      ys: bigint[],
      options?: RescueOptions,
    ): Promise<RescueReceipt | null> => {
      if (!port.current || proving.current) return null;
      const version = generation.current;
      proving.current = true;
      setBusy(true);
      setError(null);
      try {
        const receipt = await port.current.proveUntangle(creature, xs, ys, {
          onSubmitted: (hash) => {
            if (version === generation.current) options?.onSubmitted?.(hash);
          },
        });
        if (version !== generation.current) return null;
        // A failed leaderboard read must not turn a confirmed transaction into a retry.
        await loadBoard();
        return version === generation.current ? receipt : null;
      } catch (cause) {
        if (version === generation.current) setError(asError(cause));
        return null;
      } finally {
        proving.current = false;
        if (version === generation.current) setBusy(false);
      }
    },
    [loadBoard],
  );

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
  const verify = useCallback(
    async (returnTo = window.location.href) => {
      if (!port.current) return;
      const version = generation.current;
      setBusy(true);
      setError(null);
      try {
        // A previously unverified wallet may now be verified in GoodDollar, another tab,
        // or through its linked identity. Never request a signature using an old result.
        const current = await readStatus(port.current);
        if (!current || current.verified) return;
        const link = await port.current.verificationLink(returnTo);
        if (version !== generation.current) return;
        remember(rememberedWallet());
        try {
          sessionStorage.setItem(RETURNING_KEY, "1");
        } catch {
          // Without storage they land on the splash instead. Not worth blocking the check.
        }
        window.location.assign(link);
      } catch (cause) {
        if (version === generation.current) setError(asError(cause));
      } finally {
        if (version === generation.current) setBusy(false);
      }
    },
    [readStatus],
  );

  // Verification can finish in another tab or while this page is in the back/forward
  // cache. Neither path remounts the hook, so the initial connection read is not enough.
  useEffect(() => {
    if (!account) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const recheck = () => {
      if (document.visibilityState === "hidden") return;
      clearTimeout(timer);
      timer = setTimeout(() => void refresh(), 100);
    };
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);
    window.addEventListener("online", recheck);
    document.addEventListener("visibilitychange", recheck);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.removeEventListener("online", recheck);
      document.removeEventListener("visibilitychange", recheck);
    };
  }, [account, refresh]);

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
      await connect({ silent: true, walletId: rememberedWallet() });
    })();
  }, [account, connect]);

  useEffect(() => {
    if (!account) return;
    return port.current?.watchAccount?.(() => {
      ++generation.current;
      forget();
      setAccount(null);
      setStatus(null);
      setCheckingStatus(false);
      setWeek(null);
      setStanding(null);
      setAdmin(null);
      setBusy(false);
      setError("wallet-changed");
    });
  }, [account]);

  const readMarket = useCallback(async (offset = 0) => (await load()).market(offset), [load]);
  const readGameMarket = useCallback(async () => (await load()).gameMarket(), [load]);
  const readGameBoard = useCallback(async (offset = 0) => (await load()).gameBoard(offset), [load]);
  const hasRecordedRun = useCallback(
    async (id: `0x${string}`) => (await load()).hasRecordedRun(id),
    [load],
  );
  const recordGameRun = useCallback(
    async (run: GameRun, options?: RescueOptions): Promise<RescueReceipt | null> => {
      if (!port.current || proving.current) return null;
      const version = generation.current;
      proving.current = true;
      setBusy(true);
      setError(null);
      try {
        const result = await port.current.recordGameRun(run, {
          onSubmitted: (hash) => {
            if (version === generation.current) options?.onSubmitted?.(hash);
          },
        });
        return version === generation.current ? result : null;
      } catch (cause) {
        if (version === generation.current) setError(asError(cause));
        return null;
      } finally {
        proving.current = false;
        if (version === generation.current) setBusy(false);
      }
    },
    [],
  );
  const buySupply = useCallback(
    async (item: number, options?: RescueOptions) => (await load()).buySupply(item, options),
    [load],
  );
  const buyTrail = useCallback(
    async (trail: Trail) => {
      await (await load()).buyTrail(trail);
      await refresh();
    },
    [load, refresh],
  );
  const publishTrail = useCallback(
    async (draft: TrailDraft) => (await load()).publishTrail(draft),
    [load],
  );
  const withdrawTrailEarnings = useCallback(async () => {
    await (await load()).withdrawTrailEarnings();
    await refresh();
  }, [load, refresh]);

  return {
    gameSupported,
    readGameMarket,
    readGameBoard,
    hasRecordedRun,
    recordGameRun,
    buySupply,
    readMarket,
    buyTrail,
    publishTrail,
    withdrawTrailEarnings,
    statusError,
    checkingStatus,
    account,
    status,
    busy,
    error,
    available,
    week,
    connect,
    disconnect,
    connectWithEmail,
    emailOffered: emailLoginOffered(),
    listWallets,
    claim,
    verify,
    refresh,
    loadWeek,
    enterWeek,
    collectWeek,
    backWeek,
    admin,
    loadAdmin,
    openWeek,
    settleWeek,
    tipsSupported,
    boardSupported,
    standing,
    loadBoard,
    claimName,
    proveUntangle,
    loadTip,
    sendTip,
    openTip,
    reclaimTip,
  };
}
