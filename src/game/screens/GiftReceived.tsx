import { creatureColor } from "~/data";
import type { Gift } from "~/game/gift";
import { giftedCreature } from "~/game/gift";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * What opening a gift link looks like. No account, no wallet, no sign-up: the creature is
 * in the link, and accepting it puts it in this pond.
 */
export function GiftReceived({
  gift,
  onAccept,
  onDecline,
}: {
  gift: Gift;
  onAccept: () => void;
  onDecline: () => void;
}) {
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
          color: creatureColor(creature, "night"),
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
