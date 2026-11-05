import type { CSSProperties } from "react";
import { ALL_CREATURES, creatureColor } from "~/data";
import { collection, RESTORATION } from "~/game/collection";
import { useGame } from "~/game/store";
import { PALETTES } from "~/market/types";
import { CreatureSvg } from "~/render/CreatureSvg";
import { useThemeId } from "~/theme/ThemeProvider";

export function JournalScreen({ onBack, onTrails }: { onBack: () => void; onTrails: () => void }) {
  const themeId = useThemeId();
  const freed = useGame((s) => s.freed);
  const palette = useGame((s) => s.pondPalette);
  const setPalette = useGame((s) => s.setPondPalette);
  const unlocked = useGame((s) => s.unlockedPalettes);
  const c = collection(freed);
  return (
    <div className="sn-page">
      <header className="sn-page-head">
        <button className="sn-pill" type="button" onClick={onBack}>
          ← Pond
        </button>
        <span>Field journal</span>
      </header>
      <div className="sn-page-body">
        <span className="sn-eyebrow">A little world, made by you</span>
        <h1 className="sn-title">Meet the neighbours.</h1>
        <p className="sn-sub">
          {c.known.size} creatures discovered · {c.mastered.size} shell badges. Free a creature
          within par to earn its shell.
        </p>
        <section className="sn-restoration" aria-label="Pond restoration">
          {RESTORATION.map((m) => (
            <div
              key={m.count}
              className={c.world >= m.count ? "sn-milestone earned" : "sn-milestone"}
            >
              <strong>
                {c.world >= m.count ? "✓" : `${c.world}/${m.count}`} {m.name}
              </strong>
              <span>{m.detail}</span>
            </div>
          ))}
        </section>
        <h2 className="sn-section-title">Your water</h2>
        <div className="sn-palette-row">
          {PALETTES.map((p, i) => (
            <button
              key={p.name}
              type="button"
              className="sn-palette"
              aria-pressed={palette === i}
              disabled={!unlocked.includes(i)}
              onClick={() => setPalette(i)}
            >
              <span style={{ background: p.water, borderColor: p.color }} />
              {p.name}
              {!unlocked.includes(i) && " · trail reward"}
            </button>
          ))}
        </div>
        <button type="button" className="sn-link" onClick={onTrails}>
          Find a trail with a new palette →
        </button>
        <h2 className="sn-section-title">The collection</h2>
        <div className="sn-journal-grid">
          {ALL_CREATURES.map((creature) => {
            const seen = c.known.has(creature.id);
            const best = freed
              .filter((e) => e.id === creature.id && !e.gifted && e.moves > 0)
              .reduce((n, e) => Math.min(n, e.moves), Infinity);
            return (
              <article
                className={`sn-species ${seen ? "" : "unknown"}`}
                key={creature.id}
                style={
                  {
                    "--species-color": seen ? creatureColor(creature, themeId) : "transparent",
                  } as CSSProperties
                }
              >
                <div className="sn-species-art" aria-hidden="true">
                  <CreatureSvg
                    creature={creature}
                    state="free"
                    eyes={seen ? "open" : "shut"}
                    still
                  />
                </div>
                <strong>
                  {seen ? creature.name : "Undiscovered"} {c.mastered.has(creature.id) && "◉"}
                </strong>
                <span>
                  {seen
                    ? Number.isFinite(best)
                      ? `Best ${best} · par ${creature.par}`
                      : creature.shape
                    : creature.id === "glint"
                      ? "The Great Untangle"
                      : creature.id === "moonmoth"
                        ? "Daily Snarl"
                        : "Keep exploring"}
                </span>
                {seen && <p>{creature.lore}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
