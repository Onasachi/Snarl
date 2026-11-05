import { audio } from "~/audio";
import type { ThemeId } from "~/data";
import { useGame } from "~/game/store";
import { Icon } from "~/render/Icon";

/**
 * Theme and sound, which the design's prototype exposed as developer props.
 *
 * It used to carry rows for a Journal and a Shop marked "Not built yet". Honest, and
 * still a dead end every time somebody tapped them — a menu should not advertise what it
 * cannot do. They are gone; when either exists it can have a row back.
 *
 * Reduce motion is not here: it follows the system setting, which is where people have
 * already said what they want.
 */
/** Who is signed in, and the way back out. */
export interface MoreAccount {
  address: string;
  /** "MiniPay", "your wallet" — whatever we can honestly call it. */
  label: string;
  busy: boolean;
  onCopy: () => void;
  onSignOut: () => void;
}

export function MoreSheet({
  onClose,
  onBoard,
  onWeeks,
  account,
}: {
  onClose: () => void;
  /** Absent only when nothing is connected, which the gate makes rare. */
  account?: MoreAccount;
  /** Absent when no board is deployed, and then there is no row for it. */
  onBoard?: () => void;
  /** Only present for somebody who asked for it with `?weeks`. */
  onWeeks?: () => void;
}) {
  const theme = useGame((s) => s.theme);
  const setTheme = useGame((s) => s.setTheme);
  const sound = useGame((s) => s.sound);
  const setSound = useGame((s) => s.setSound);

  const chooseTheme = (next: ThemeId) => {
    setTheme(next);
    audio.init();
    audio.tick();
  };

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
        {account && (
          <div
            style={{
              display: "grid",
              gap: 8,
              padding: "12px 14px",
              marginBottom: 4,
              border: "1px solid var(--card-line)",
              borderRadius: 16,
            }}
          >
            <span
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Signed in with {account.label}
            </span>
            <button
              type="button"
              onClick={account.onCopy}
              title="Copy your address"
              style={{
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--ink)",
                fontSize: 14,
                textAlign: "left",
                wordBreak: "break-all",
                cursor: "pointer",
              }}
            >
              {account.address}
            </button>
            <button
              type="button"
              onClick={account.onSignOut}
              disabled={account.busy}
              style={{
                justifySelf: "start",
                minHeight: 40,
                padding: "0 14px",
                border: "1px solid var(--card-line)",
                borderRadius: 999,
                background: "transparent",
                color: "var(--ink2)",
                fontSize: 14,
                cursor: account.busy ? "default" : "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}

        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink2)",
              padding: 0,
            }}
          >
            Pond
          </legend>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {(["night", "paper"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => chooseTheme(option)}
                aria-pressed={theme === option}
                style={{
                  flex: 1,
                  minHeight: 48,
                  border: `1px solid ${theme === option ? "var(--ink)" : "var(--card-line)"}`,
                  borderRadius: 14,
                  background: "transparent",
                  color: "var(--ink)",
                  fontSize: 16,
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => setSound(!sound)}
          aria-pressed={sound}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            minHeight: 56,
            marginTop: 16,
            padding: "0 4px",
            border: "none",
            background: "transparent",
            color: "var(--ink)",
            fontSize: 17,
            cursor: "pointer",
          }}
        >
          <span>Sound</span>
          <span
            aria-hidden="true"
            style={{
              width: 52,
              height: 32,
              padding: 3,
              borderRadius: 999,
              border: "1px solid var(--card-line)",
              background: sound ? "var(--ink)" : "transparent",
              display: "flex",
              justifyContent: sound ? "flex-end" : "flex-start",
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: sound ? "var(--bg)" : "var(--ink2)",
                transition: "background .2s",
              }}
            />
          </span>
        </button>

        {onBoard && (
          <button
            type="button"
            onClick={onBoard}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minHeight: 56,
              padding: "0 4px",
              border: "none",
              background: "transparent",
              color: "var(--ink)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="board" />
              The Board
            </span>
            <Icon name="chevron" size={16} style={{ color: "var(--ink2)" }} />
          </button>
        )}

        {onWeeks && (
          <button
            type="button"
            onClick={onWeeks}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              minHeight: 56,
              padding: "0 4px",
              border: "none",
              background: "transparent",
              color: "var(--ink)",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name="knot" />
              Weeks
            </span>
            <Icon name="chevron" size={16} style={{ color: "var(--ink2)" }} />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 52,
            marginTop: 10,
            border: "1px solid var(--card-line)",
            borderRadius: 16,
            background: "transparent",
            color: "var(--ink)",
            fontSize: 17,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Back to the pond
        </button>
      </div>
    </div>
  );
}
