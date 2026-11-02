import { useEffect, useState } from "react";
import { DAILY_CREATURE, formatCountdown, msUntilTomorrow } from "~/game/daily";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * The Daily Snarl, on the pond. A silhouette until it is freed, then the creature itself
 * with the time until the next one. One rare knot a day is the whole of the ritual.
 */
export function DailyCard({
  solved,
  subtitle,
  onOpen,
}: {
  solved: boolean;
  /** "Freed by 1,284 today", "Freed today", or null when there is nothing to say. */
  subtitle: string | null;
  onOpen: () => void;
}) {
  const until = useCountdown(solved);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        minHeight: 76,
        padding: "12px 16px",
        textAlign: "left",
        border: "1px solid var(--card-line)",
        borderRadius: 20,
        background: "var(--card)",
        color: "var(--ink)",
        cursor: "pointer",
      }}
    >
      <span style={{ width: 48, height: 48, flex: "0 0 auto", opacity: solved ? 1 : 0.6 }}>
        <CreatureSvg
          creature={DAILY_CREATURE}
          state={solved ? "free" : "silhouette"}
          eyes="open"
          r={5}
          sw={2.2}
          still
        />
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
          Daily Snarl
        </span>
        <span style={{ fontSize: 17, fontWeight: 500 }}>
          {solved ? DAILY_CREATURE.name : "A rare Snarl"}
        </span>
        {(subtitle || solved) && (
          <span style={{ fontSize: 13, color: "var(--ink2)" }}>
            {subtitle ?? `Next in ${until}`}
          </span>
        )}
      </span>

      <span
        style={{
          flex: "0 0 auto",
          fontSize: 15,
          fontWeight: 500,
          color: solved ? "var(--ink2)" : "var(--ink)",
          border: "1px solid var(--card-line)",
          borderRadius: 999,
          padding: "10px 14px",
        }}
      >
        {solved ? "Done" : "Untangle"}
      </span>
    </button>
  );
}

/** Ticks once a minute, and only while there is a countdown on screen. */
function useCountdown(active: boolean): string {
  const [ms, setMs] = useState(() => msUntilTomorrow());

  useEffect(() => {
    if (!active) return;
    setMs(msUntilTomorrow());
    const timer = window.setInterval(() => setMs(msUntilTomorrow()), 30_000);
    return () => clearInterval(timer);
  }, [active]);

  return formatCountdown(ms);
}
