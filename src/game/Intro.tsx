import { MOON_REWARD_NUDGES } from "~/game/progress";

/** A dismissible next step that leaves the pond and its controls available. */
export function Intro({
  onDone,
  onDaily,
  dailySolved,
}: {
  onDone: () => void;
  onDaily: () => void;
  dailySolved: boolean;
}) {
  return (
    <section aria-labelledby="pond-welcome" style={{ padding: "4px 20px 14px" }}>
      <h2 id="pond-welcome" style={{ fontSize: 21, fontWeight: 500, margin: "0 0 4px" }}>
        Your pond starts here
      </h2>
      <p style={{ fontSize: 14, lineHeight: 1.4, color: "var(--ink2)", margin: 0 }}>
        Keep collecting in World 1. Come back for a rare knot each day — a full moon earns{" "}
        {MOON_REWARD_NUDGES} nudges to help with tricky knots.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {!dailySolved && (
          <button type="button" onClick={onDaily} style={{ ...button, color: "var(--ink)" }}>
            Try the Daily Snarl
          </button>
        )}
        <button type="button" onClick={onDone} style={button}>
          Explore the pond
        </button>
      </div>
    </section>
  );
}

const button = {
  minHeight: 44,
  padding: "0 12px",
  border: "1px solid var(--card-line)",
  borderRadius: 12,
  background: "transparent",
  color: "var(--ink2)",
  fontSize: 14,
  cursor: "pointer",
} as const;
