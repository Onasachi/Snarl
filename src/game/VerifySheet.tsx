/**
 * Screen 12: the one time the game asks for anything. Everything it says here has to be
 * true — the check is GoodDollar's, it happens on their site, it only proves the player
 * is one unique person, and no puzzle has ever needed it.
 */
export function VerifySheet({
  busy,
  onStart,
  onClose,
}: {
  busy: boolean;
  onStart: () => void;
  onClose: () => void;
}) {
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
          background: "var(--bg2)",
          borderTop: "1px solid var(--card-line)",
          borderRadius: "28px 28px 0 0",
          animation: "sn-up .35s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <h2 style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>Claim free G$ every day</h2>
        <p style={{ fontSize: 17, lineHeight: 1.4, color: "var(--ink2)", margin: "12px 0 0" }}>
          Verifying is not needed to play — your wallet is already enough for that. It is needed to
          claim: once GoodDollar has seen that you are a real, unique person, the daily UBI is yours
          here.
        </p>

        <ul style={{ margin: "18px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
          {[
            "A daily G$ claim (UBI)",
            "Gifts to friends, when they arrive",
            "Nothing in the puzzles changes",
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
          The face check runs on GoodDollar's own site, not here. It confirms you are unique and
          nothing else. Your wallet will ask you to sign a message first, and you will come back to
          the pond when it is done.
        </p>

        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          style={{
            width: "100%",
            minHeight: 52,
            marginTop: 20,
            border: "none",
            borderRadius: 16,
            background: "var(--ink)",
            color: "var(--bg)",
            fontSize: 18,
            fontWeight: 500,
            opacity: busy ? 0.6 : 1,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Opening GoodDollar…" : "Continue to GoodDollar"}
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
