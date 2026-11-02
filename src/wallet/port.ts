export type Address = `0x${string}`;

export interface WalletAccount {
  address: Address;
  chainId: number;
  /** "MiniPay", "Valora", "the browser wallet" — whatever we can honestly call it. */
  label: string;
}

export interface ClaimStatus {
  /** Verified as a unique person with GoodDollar. Nothing in the game requires this. */
  verified: boolean;
  /** What can be claimed right now, in the token's smallest unit. */
  entitlement: bigint;
  /** When the next claim opens, if there is nothing to claim now. */
  nextClaimAt: Date | null;
  balance: bigint;
  decimals: number;
}

/**
 * Everything the game needs from a wallet, and no more. The game is whole without one:
 * puzzles, the pond and the streak never call any of this.
 *
 * Two implementations: the real one over an injected EIP-1193 provider and GoodDollar's
 * citizen SDK, and a demo one that lets every state be driven without a wallet or a
 * single real transaction.
 */
export interface WalletPort {
  connect(): Promise<WalletAccount>;
  getClaimStatus(): Promise<ClaimStatus>;
  /** Claims the daily UBI. Returns what actually arrived. */
  claim(): Promise<{ amount: bigint }>;
  /**
   * A link to GoodDollar's own face check. It is their hosted flow on their domain —
   * the camera never belongs to this app — and it returns the player to `returnTo`.
   */
  verificationLink(returnTo: string): Promise<string>;
}

export type ClaimCardState = "disconnected" | "unverified" | "ready" | "claimed";

export const claimCardState = (
  account: WalletAccount | null,
  status: ClaimStatus | null,
): ClaimCardState => {
  if (!account || !status) return "disconnected";
  if (!status.verified) return "unverified";
  return status.entitlement > 0n ? "ready" : "claimed";
};

/**
 * G$ as a person reads it. Truncates rather than rounds: showing someone more money than
 * they have is a worse lie than showing a hundredth less.
 *
 * Decimals are not a constant. G$ is 18 decimals on Celo and 2 on Fuse, so the number
 * always travels with the chain it came from.
 */
export function formatG$(value: bigint, decimals: number, places = 2): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  const scaled =
    places >= decimals
      ? fraction * 10n ** BigInt(places - decimals)
      : fraction / 10n ** BigInt(decimals - places);

  const sign = negative ? "-" : "";
  const wholeText = whole.toLocaleString("en-US");
  if (places === 0) return `${sign}${wholeText}`;
  return `${sign}${wholeText}.${scaled.toString().padStart(places, "0")}`;
}

/** "152.37 G$" */
export const formatAmount = (value: bigint, decimals: number): string =>
  `${formatG$(value, decimals)} G$`;
