import { MOON_PHASES, MOON_REWARD_NUDGES, moonLabel } from "./progress";

const R = 9;

/**
 * The streak moon, waxing from new to full over seven Daily Snarls. Drawn as a lit disc
 * with the night sliding off it, so a glance says "nearly there" without reading a number.
 */
export function Moon({ moon, onTap }: { moon: number; onTap: () => void }) {
  const lit = Math.max(0, Math.min(1, moon / MOON_PHASES));

  return (
    <button
      type="button"
      onClick={onTap}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        minHeight: 44,
        padding: "0 8px",
        border: "1px solid var(--card-line)",
        borderRadius: 999,
        background: "transparent",
        color: "var(--ink)",
        cursor: "pointer",
      }}
    >
      <svg width={R * 2} height={R * 2} viewBox={`0 0 ${R * 2} ${R * 2}`} aria-hidden="true">
        <title>Streak moon</title>
        <defs>
          <clipPath id="moon-disc">
            <circle cx={R} cy={R} r={R} />
          </clipPath>
        </defs>
        <g clipPath="url(#moon-disc)">
          <circle cx={R} cy={R} r={R} fill="var(--moon)" />
          <circle
            cx={R}
            cy={R}
            r={R}
            fill="var(--bg)"
            style={{
              transform: `translateX(${(lit * 2 * R).toFixed(2)}px)`,
              transition: "transform .6s ease",
            }}
          />
        </g>
        <circle cx={R} cy={R} r={R - 0.5} fill="none" stroke="var(--card-line)" />
      </svg>
      <span style={{ display: "grid", textAlign: "left" }}>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.2 }}>{moonLabel(moon)}</span>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.03em",
            textTransform: "uppercase",
            color: "var(--ink2)",
            whiteSpace: "nowrap",
          }}
        >
          {MOON_REWARD_NUDGES} bonus nudges
        </span>
      </span>
    </button>
  );
}
