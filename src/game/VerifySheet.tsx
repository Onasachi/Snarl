import { type WalletAccount, wantsDemoWallet } from "~/wallet";
/**
 * Screen 12: the one time the game asks for anything. Everything it says here has to be
 * true — the check is GoodDollar's, it happens on their site, it only proves the player
 * is one unique person, and no puzzle has ever needed it.
 */
export function VerifySheet({
  busy,
  account,
  statusError,
  onRefresh,
  onStart,
  onClose,
}: {
  busy: boolean;
  account: WalletAccount | null;
  statusError: boolean;
  onRefresh: () => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const demo = wantsDemoWallet();
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgb(5 8 15 / 60%)",
        animation: "sn-fade .25s ease-out",
      }}
    >
      <div
        style={{
          padding: "24px 20px calc(24px + env(safe-area-inset-bottom))",
          maxHeight: "100%",
          overflowY: "auto",
          background: "var(--bg2)",
          borderTop: "1px solid var(--card-line)",
          borderRadius: "28px 28px 0 0",
          animation: "sn-up .35s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <h2 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Claim free G$ every day</h2>
        <p style={{ fontSize: 17, lineHeight: 1.4, color: "var(--ink2)", margin: "12px 0 0" }}>
          Verify with GoodDollar to claim daily G$ and publish trails for other players. Playing,
          buying supplies and recording gameplay do not require this check.
        </p>

        <p style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink2)", margin: "12px 0 0" }}>
          Already verified with GoodDollar? Use that same wallet, or one linked to its identity.
          {account && (
            <span style={{ display: "block", overflowWrap: "anywhere" }}>
              Connected: {account.address}
            </span>
          )}
          <button className="sn-link" type="button" disabled={busy} onClick={onRefresh}>
            Check existing verification
          </button>
        </p>
        {statusError && (
          <p role="status" style={{ color: "var(--ink2)", fontSize: 13 }}>
            We couldn't check GoodDollar. Retry the check before continuing.
          </p>
        )}

        <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {[
            "A daily G$ claim (UBI)",
            "Publish trails and earn G$ from sales",
            "Spend your G$ on hints, boosts and player-made trails",
          ].map((item) => (
            <li key={item} style={{ display: "flex", gap: 10, fontSize: 15, color: "var(--ink)" }}>
              <span aria-hidden="true" style={{ color: "var(--ink2)" }}>
                ·
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink2)", margin: "18px 0 0" }}>
          {demo
            ? "Demo only: this simulates verification on localhost. No identity service, camera, wallet signature or real funds are used."
            : "The face check runs on GoodDollar’s own site. Your wallet will ask you to sign a message first, then you will return here."}
        </p>

        <button
          type="button"
          onClick={onStart}
          disabled={busy || statusError}
          style={{
            width: "100%",
            minHeight: 52,
            marginTop: 20,
            border: "none",
            borderRadius: 16,
            background: "var(--accent)",
            color: "var(--on-accent)",
            fontSize: 18,
            fontWeight: 500,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Opening…" : demo ? "Simulate verification" : "Continue to GoodDollar"}
        </button>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 48,
            marginTop: 8,
            border: "none",
            borderRadius: 16,
            background: "transparent",
            color: "var(--ink2)",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          Keep playing without
        </button>
      </div>
    </div>
  );
}
