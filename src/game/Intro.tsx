import { useEffect, useState } from "react";

/**
 * The first look at the pond, explained once.
 *
 * Not tooltips pinned to elements: a pond is a different shape on every phone and a
 * creature drifts, so an arrow pointing at one would be pointing somewhere else a second
 * later. This dims the screen and says what the thing on it is, in the order somebody
 * would meet them, and gets out of the way for good.
 *
 * Skippable on the first tap, because an intro nobody can escape is worse than none.
 */
export interface IntroStep {
  title: string;
  body: string;
}

const STEPS: readonly IntroStep[] = [
  {
    title: "This is your pond",
    body: "Every creature you free comes to live here. They swim about on their own; tap one and it will notice you.",
  },
  {
    title: "A knot a day",
    body: "One rare creature a day, the same one for everybody. Each solve grows your streak moon, and a full moon is seven nudges.",
  },
  {
    title: "The Great Untangle",
    body: "One knot a week that the whole pond is working on. Free it and Glint is yours — and if there is G$ in the pot, a share of that on Sunday.",
  },
  {
    title: "Free UBI, if you want it",
    body: "GoodDollar gives a daily basic income to anybody who proves they are a real person. snarl never needs it. It is just here if you would like it.",
  },
];

export function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  // Escape leaves, the same as Skip. A first-run overlay should never be a trap.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  if (!current) return null;
  const last = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="What is on this screen"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "rgb(5 8 15 / 72%)",
        animation: "sn-fade .25s ease-out",
      }}
    >
      <div
        style={{
          padding: "22px 22px calc(22px + env(safe-area-inset-bottom))",
          background: "var(--bg2)",
          borderTop: "1px solid var(--card-line)",
          borderRadius: "28px 28px 0 0",
          animation: "sn-up .35s cubic-bezier(.2,.8,.2,1) both",
        }}
      >
        <div aria-hidden="true" style={{ display: "flex", gap: 5, marginBottom: 14 }}>
          {STEPS.map((entry, i) => (
            <span
              key={entry.title}
              style={{
                height: 3,
                flex: 1,
                borderRadius: 999,
                background: i <= step ? "var(--ink)" : "var(--card-line)",
                transition: "background .3s",
              }}
            />
          ))}
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 6px" }}>{current.title}</h2>
        <p style={{ fontSize: 16, lineHeight: 1.45, color: "var(--ink2)", margin: 0 }}>
          {current.body}
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            type="button"
            onClick={onDone}
            style={{
              minHeight: 52,
              padding: "0 18px",
              border: "none",
              borderRadius: 16,
              background: "transparent",
              color: "var(--ink2)",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {last ? "" : "Skip"}
          </button>
          <button
            type="button"
            onClick={() => (last ? onDone() : setStep(step + 1))}
            style={{
              flex: 1,
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
            {last ? "Into the pond" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
