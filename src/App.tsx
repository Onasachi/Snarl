import { CREATURES, TUTORIAL } from "~/data";

/**
 * Phase 0 shell: proves the theme tokens, the self-hosted Fredoka and the PWA build are
 * wired up. The splash, puzzle and pond screens land in Phase 2 and replace all of this.
 */
export function App() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center", padding: 16 }}>
        <h1 style={{ fontSize: 68, fontWeight: 600, letterSpacing: "-0.03em", margin: 0 }}>
          snarl
        </h1>
        <p style={{ color: "var(--ink2)", fontSize: 19, margin: "8px 0 0" }}>
          Untangle a knot. Free a creature.
        </p>
        <p className="tnum" style={{ color: "var(--ink2)", fontSize: 12, marginTop: 32 }}>
          {TUTORIAL.length + CREATURES.length} knots authored · engine ready
        </p>
      </div>
    </div>
  );
}
