import type { WalletPort } from "./port";

export type {
  Address,
  ClaimCardState,
  ClaimStatus,
  WalletAccount,
  WalletPort,
  WeekStatus,
} from "./port";
export { claimCardState, formatAmount, formatG$ } from "./port";

/** Development only, and only when asked for: ?wallet=demo. */
export const wantsDemoWallet = (): boolean =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get("wallet") === "demo";

/**
 * Loaded on demand, never at startup. Most players never open a wallet, and they should
 * not pay for one in the bundle they download to play a puzzle game.
 */
export async function createWallet(): Promise<WalletPort> {
  if (wantsDemoWallet()) {
    const { createDemoWallet } = await import("./demo");
    return createDemoWallet();
  }
  const { createLiveWallet } = await import("./live");
  return createLiveWallet();
}

/** True when a wallet could be connected at all. */
export async function walletAvailable(): Promise<boolean> {
  if (wantsDemoWallet()) return true;
  const { findProvider } = await import("./live");
  return findProvider() !== null;
}
