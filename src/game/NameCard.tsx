import { creatureColor } from "~/data";
import type { Creature } from "~/engine";
import { CreatureSvg } from "~/render/CreatureSvg";
import { useThemeId } from "~/theme/ThemeProvider";

/**
 * The reveal. Slides up 48pt and fades in 550ms after the Unfurl ends, so the creature is
 * already itself before it is named.
 */
export function NameCard({
  creature,
  chips,
  actionLabel,
  onAction,
}: {
  creature: Creature;
  chips: readonly string[];
  actionLabel: string;
  onAction: () => void;
}) {
  const themeId = useThemeId();
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        padding: "24px 20px calc(24px + env(safe-area-inset-bottom))",
        background: "var(--bg2)",
        borderTop: "1px solid var(--card-line)",
        borderRadius: "28px 28px 0 0",
        animation: "sn-up .6s cubic-bezier(.2,.8,.2,1) both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 56, height: 56, flex: "0 0 auto" }}>
          <CreatureSvg creature={creature} state="free" eyes="open" r={5.4} sw={2.4} still />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1.05,
              color: creatureColor(creature, themeId),
            }}
          >
            {creature.name}
          </div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink2)",
            }}
          >
            {creature.shape}
          </div>
        </div>
      </div>

      <p style={{ fontSize: 19, lineHeight: 1.35, color: "var(--ink2)", margin: "16px 0 0" }}>
        {creature.lore}
      </p>

      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
          {chips.map((chip) => (
            <span
              key={chip}
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
                border: "1px solid var(--card-line)",
                borderRadius: 999,
                padding: "6px 12px",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onAction}
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
          cursor: "pointer",
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
