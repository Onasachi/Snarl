import { formatCountdown } from "~/game/daily";
import type { ClaimCardState, ClaimStatus } from "~/wallet";
import { formatAmount, formatG$ } from "~/wallet";

interface Copy {
  title: string;
  subtitle: string;
  action: string | null;
  filled: boolean;
}

/**
 * The claim card, in each of its states. Calm, not like a wallet: the amount is shown
 * plainly before it moves, and nothing here ever gates a puzzle.
 */
function copyFor(state: ClaimCardState, status: ClaimStatus | null, hasWallet: boolean): Copy {
  switch (state) {
    case "ready":
      return {
        title: status ? formatAmount(status.entitlement, status.decimals) : "Ready",
        subtitle: "Your daily GoodDollar",
        action: "Claim",
        filled: true,
      };
    case "claimed":
      return {
        title: "Claimed",
        subtitle: status?.nextClaimAt
          ? `Next in ${formatCountdown(status.nextClaimAt.getTime() - Date.now())}`
          : "Back tomorrow",
        action: null,
        filled: false,
      };
    case "unverified":
      return {
        title: "Free UBI",
        subtitle: "Verify once to start",
        action: "Verify",
        filled: false,
      };
    default:
      return hasWallet
        ? {
            title: "Free UBI",
            subtitle: "Connect a wallet to start",
            action: "Connect",
            filled: false,
          }
        : {
            // No provider at all. Saying so is kinder than a button that cannot work.
            title: "Free UBI",
            subtitle: "Open snarl in a wallet app to claim",
            action: null,
            filled: false,
          };
  }
}

export function ClaimCard({
  state,
  status,
  hasWallet,
  busy,
  onAction,
}: {
  state: ClaimCardState;
  status: ClaimStatus | null;
  hasWallet: boolean;
  busy: boolean;
  onAction: () => void;
}) {
  const copy = copyFor(state, status, hasWallet);
  // An empty balance is not news. It appears once there is something in it.
  const showBalance = status !== null && status.balance > 0n;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        minHeight: 76,
        padding: "12px 16px",
        border: "1px solid var(--card-line)",
        borderRadius: 20,
        background: "var(--card)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          placeItems: "center",
          width: 48,
          height: 48,
          flex: "0 0 auto",
          borderRadius: "50%",
          border: "1px solid var(--card-line)",
          color: "var(--ink2)",
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        G$
      </span>

      <span style={{ display: "grid", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink2)",
          }}
        >
          Daily G$
        </span>
        <span className="tnum" style={{ fontSize: 17, fontWeight: 500 }}>
          {copy.title}
        </span>
        <span style={{ fontSize: 13, color: "var(--ink2)" }}>
          {copy.subtitle}
          {showBalance && status && (
            <>
              {" · "}
              <span className="tnum">{formatG$(status.balance, status.decimals)} in wallet</span>
            </>
          )}
        </span>
      </span>

      {copy.action && (
        <button
          type="button"
          onClick={onAction}
          disabled={busy}
          style={{
            flex: "0 0 auto",
            minHeight: 44,
            padding: "0 16px",
            fontSize: 15,
            fontWeight: 500,
            border: copy.filled ? "none" : "1px solid var(--card-line)",
            borderRadius: 999,
            background: copy.filled ? "var(--ink)" : "transparent",
            color: copy.filled ? "var(--bg)" : "var(--ink)",
            opacity: busy ? 0.5 : 1,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "…" : copy.action}
        </button>
      )}
    </div>
  );
}
