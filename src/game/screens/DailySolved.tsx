import { useEffect, useState } from "react";
import { DAILY_CREATURE, formatClock, formatCountdown, msUntilTomorrow } from "~/game/daily";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * Tapping a Daily Snarl that is already freed. It does not re-open the puzzle: one rare
 * knot a day is the point, so this says when it was freed and when the next one arrives.
 */
export function DailySolved({
  at,
  others,
  onBack,
}: {
  at: number | null;
  /** "with 1,284 others", when the count is known. */
  others: number | null;
  onBack: () => void;
}) {
  const [ms, setMs] = useState(() => msUntilTomorrow());

  useEffect(() => {
    const timer = window.setInterval(() => setMs(msUntilTomorrow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const when = at === null ? null : formatClock(at);
  const line =
    when === null
      ? "Freed today."
      : others === null
        ? `You freed it at ${when}.`
        : `You freed it at ${when}, with ${others.toLocaleString()} others.`;

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
      <div style={{ width: 150, height: 150 }}>
        <CreatureSvg creature={DAILY_CREATURE} state="free" eyes="open" r={5} sw={2.2} />
      </div>

      <h2 style={{ fontSize: 30, fontWeight: 600, margin: "8px 0 0" }}>{DAILY_CREATURE.name}</h2>
      <p style={{ fontSize: 19, lineHeight: 1.35, color: "var(--ink2)", margin: 0 }}>{line}</p>
      <p className="tnum" style={{ fontSize: 15, color: "var(--ink2)", margin: 0 }}>
        Next rare Snarl in {formatCountdown(ms)}
      </p>

      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: 20,
          minHeight: 48,
          padding: "0 22px",
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
  );
}
