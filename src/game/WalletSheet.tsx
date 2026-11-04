/**
 * Which wallet.
 *
 * Only ever shown when there is a genuine choice — two or more wallets announced
 * themselves. With one, or inside MiniPay, connecting just connects.
 *
 * It exists because the alternative was picking for the player, and any rule for doing
 * that is wrong some of the time: the one that lost Connect to a Solana wallet was
 * "whichever has already authorised an account here", which is really "whichever
 * extension the browser let in first".
 */
export function WalletSheet({
  wallets,
  onPick,
  onClose,
}: {
  wallets: readonly { id: string; name: string }[];
  onPick: (id: string) => void;
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
        background: "rgb(5 8 15 / 55%)",
        animation: "sn-fade .25s ease-out",
      }}
    >
      <div
        style={{
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom))",
          background: "var(--bg2)",
          borderTop: "1px solid var(--card-line)",
          borderRadius: "28px 28px 0 0",
          animation: "sn-up .35s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 500, margin: "0 0 4px" }}>Which wallet?</h2>
        <p style={{ fontSize: 13, lineHeight: 1.45, color: "var(--ink2)", margin: "0 0 14px" }}>
          snarl lives on Celo. A wallet for another chain will connect and then have nothing to say
          about GoodDollar.
        </p>

        <div style={{ display: "grid", gap: 8 }}>
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              type="button"
              onClick={() => onPick(wallet.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                minHeight: 56,
                padding: "0 16px",
                border: "1px solid var(--card-line)",
                borderRadius: 16,
                background: "transparent",
                color: "var(--ink)",
                fontSize: 17,
                cursor: "pointer",
              }}
            >
              <span>{wallet.name}</span>
              <span aria-hidden="true" style={{ color: "var(--ink2)" }}>
                ›
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 52,
            marginTop: 14,
            border: "none",
            borderRadius: 16,
            background: "var(--card)",
            color: "var(--ink2)",
            fontSize: 17,
            cursor: "pointer",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
