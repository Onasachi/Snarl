export type Address = `0x${string}`;

export interface WalletAccount {
  address: Address;
  chainId: number;
  /** "MiniPay", "Valora", "the browser wallet" — whatever we can honestly call it. */
  label: string;
  /**
   * False when the wallet would not move to Celo. Everything the game *reads* still
   * works, because reads go through our own client; anything that needs a signature
   * does not, and the screen says which.
   */
  onCelo: boolean;
}

export interface ClaimStatus {
  /** Verified as a unique person with GoodDollar. Nothing in the game requires this. */
  verified: boolean;
  /**
   * True when GoodDollar has verified this person before, whatever it says today.
   *
   * The two are not the same question, and telling somebody they are "not verified" when
   * what GoodDollar means is "show us your face again" reads as a broken app rather than
   * an expiring credential. Its re-verification ladder starts at three days, so this
   * happens to ordinary people constantly.
   */
  everVerified: boolean;
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
/** What the chain says about one week of the Great Untangle. */
export interface WeekStatus {
  pool: bigint;
  entrants: number;
  closesAt: Date;
  settled: boolean;
  /** Each entrant's share, once the week is settled. */
  share: bigint;
  entered: boolean;
  collected: boolean;
  decimals: number;
}

/**
 * G$ waiting behind a gift link, as the chain has it. Null means there is no escrow
 * contract configured, or nothing behind this particular link.
 */
export interface TipStatus {
  /** Who put the money up. The sender is the only one who can ever take it back. */
  from: Address;
  amount: bigint;
  decimals: number;
  opened: boolean;
  /** After this, an unopened gift can be taken back by whoever sent it. */
  reclaimableAt: Date;
}

/** One person on the leaderboard. Keyed by identity root, so one row is one human. */
export interface BoardRow {
  root: Address;
  /** "" for somebody who has not claimed one. */
  name: string;
  /** Proofs filed. See SnarlBoard's own note on what that does and does not measure. */
  untangles: number;
  /** Different creatures freed at least once — the column the roster's size bounds. */
  distinct: number;
  /** One bit per creature number, as the contract keeps it. */
  freed: bigint;
  weeks: number;
  streak: number;
  bestStreak: number;
}

export interface Standing {
  /** Everyone, already sorted. */
  rows: BoardRow[];
  /** This player's row, which may not be among the rows shown. Null if they have none. */
  mine: BoardRow | null;
  /** Their identity root, when a wallet is open — what the board files them under. */
  root: Address | null;
}

export interface WalletPort {
  /** False when no escrow contract is configured. A gift is then a creature and no more. */
  readonly tipsSupported: boolean;
  /** False when no board is deployed. The game then keeps score only for itself. */
  readonly boardSupported: boolean;
  connect(): Promise<WalletAccount>;
  getClaimStatus(): Promise<ClaimStatus>;
  /** Claims the daily UBI. Returns what actually arrived. */
  claim(): Promise<{ amount: bigint }>;
  /**
   * A link to GoodDollar's own face check. It is their hosted flow on their domain —
   * the camera never belongs to this app — and it returns the player to `returnTo`.
   */
  verificationLink(returnTo: string): Promise<string>;

  /**
   * The Great Untangle's pool. Null everywhere means no contract is configured, and the
   * screen then speaks only for the player in front of it, exactly as it did before there
   * was a contract at all.
   */
  week(id: number): Promise<WeekStatus | null>;
  /** Enters the week by handing the contract an untangled drawing of its knot. */
  enterWeek(id: number, xs: bigint[], ys: bigint[]): Promise<void>;
  /** Takes this person's share of a settled week. */
  collectWeek(id: number): Promise<{ amount: bigint }>;

  /**
   * G$ behind a gift link. Needs no connected wallet — someone opening their first link
   * should be able to see what is waiting for them before deciding to get one.
   */
  tip(key: string): Promise<TipStatus | null>;
  /** Puts G$ behind a link. The key never leaves the sender's device. */
  sendTip(key: string, amount: bigint): Promise<void>;
  /** Opens a gift, paying the connected wallet. */
  openTip(key: string): Promise<{ amount: bigint }>;
  /** Takes back a gift nobody opened. Only the sender, only after the window. */
  reclaimTip(key: string): Promise<{ amount: bigint }>;

  /**
   * The whole board, sorted, with names and weekly runs joined on. Needs no wallet —
   * a leaderboard nobody can read without connecting one is not a leaderboard.
   */
  board(): Promise<Standing | null>;
  /** Takes a name for this person. Lowercase, digits and underscore, 3–20 characters. */
  claimName(name: string): Promise<void>;
  /** Files one untangled drawing against a creature's number on the roster. */
  proveUntangle(creature: number, xs: bigint[], ys: bigint[]): Promise<void>;
}

export type ClaimCardState = "disconnected" | "unverified" | "expired" | "ready" | "claimed";

export const claimCardState = (
  account: WalletAccount | null,
  status: ClaimStatus | null,
): ClaimCardState => {
  if (!account || !status) return "disconnected";
  // Verified before and not today is a different sentence from never verified, and
  // GoodDollar produces the first one constantly: its re-verification ladder starts at
  // three days. Told "you are not verified", somebody who verified last week reasonably
  // concludes the app cannot see their wallet.
  if (!status.verified) return status.everVerified ? "expired" : "unverified";
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
