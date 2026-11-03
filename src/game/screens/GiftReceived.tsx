import { creatureColor } from "~/data";
import type { Gift } from "~/game/gift";
import { giftedCreature } from "~/game/gift";
import { CreatureSvg } from "~/render/CreatureSvg";
import { useThemeId } from "~/theme/ThemeProvider";
import { formatAmount, type TipStatus } from "~/wallet";

/** The money side of a received gift, when the link carried a key and a contract holds it. */
export interface ReceivedTip {
  status: TipStatus | null;
  /** True when this browser already has a wallet open. */
  connected: boolean;
  busy: boolean;
  onConnect: () => void;
  onTake: () => void;
}

/**
 * What opening a gift link looks like. No account, no wallet, no sign-up: the creature is
 * in the link, and accepting it puts it in this pond.
 *
 * G$ is the one part that cannot work that way. If the link carries money, taking it
 * needs an address to pay, so it needs a wallet — but only for the money. The creature
 * does not wait for it.
 */
export function GiftReceived({
  gift,
  onAccept,
  onDecline,
  tip,
}: {
  gift: Gift;
  onAccept: () => void;
  onDecline: () => void;
  tip: ReceivedTip;
}) {
  const themeId = useThemeId();
  const creature = giftedCreature(gift);
  if (!creature) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 28,
        textAlign: "center",
        background: "var(--bg)",
        animation: "sn-fade .3s ease-out",
      }}
    >
      <div style={{ width: 160, height: 160 }}>
        <CreatureSvg creature={creature} state="free" eyes="open" r={5} sw={2.2} />
      </div>

      <p
        style={{
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ink2)",
          margin: "8px 0 0",
        }}
      >
        A gift
      </p>
      <h2
        style={{
          fontSize: 30,
          fontWeight: 600,
          margin: 0,
          color: creatureColor(creature, themeId),
        }}
      >
        {creature.name}
      </h2>
      <p style={{ fontSize: 19, lineHeight: 1.35, color: "var(--ink2)", margin: 0 }}>
        {gift.from ? `${gift.from} freed it for you.` : "Someone freed it for you."}
      </p>
      <p style={{ fontSize: 15, lineHeight: 1.4, color: "var(--ink2)", margin: "4px 0 0" }}>
        {creature.lore}
      </p>

      {tip.status && (
        <p
          className="tnum"
          style={{
            margin: "14px 0 0",
            padding: "8px 16px",
            border: "1px solid var(--card-line)",
            borderRadius: 999,
            fontSize: 17,
            color: tip.status.opened ? "var(--ink2)" : "var(--ink)",
          }}
        >
          {tip.status.opened
            ? "The G$ on this link is gone"
            : `and ${formatAmount(tip.status.amount, tip.status.decimals)}`}
        </p>
      )}

      <button
        type="button"
        onClick={onAccept}
        style={{
          marginTop: 22,
          minWidth: 200,
          minHeight: 52,
          border: "none",
          borderRadius: 16,
          background: "var(--ink)",
          color: "var(--bg)",
          fontSize: 18,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Add to my pond
      </button>
      {tip.status && !tip.status.opened && (
        <button
          type="button"
          onClick={tip.connected ? tip.onTake : tip.onConnect}
          disabled={tip.busy}
          style={{
            marginTop: 10,
            minWidth: 200,
            minHeight: 48,
            border: "1px solid var(--card-line)",
            borderRadius: 16,
            background: "transparent",
            color: "var(--ink)",
            fontSize: 16,
            fontWeight: 500,
            cursor: tip.busy ? "default" : "pointer",
          }}
        >
          {tip.busy
            ? "…"
            : tip.connected
              ? `Take the ${formatAmount(tip.status.amount, tip.status.decimals)}`
              : "Open a wallet for the G$"}
        </button>
      )}

      <button
        type="button"
        onClick={onDecline}
        style={{
          minHeight: 48,
          marginTop: 4,
          border: "none",
          background: "transparent",
          color: "var(--ink2)",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        Not now
      </button>
    </div>
  );
}
