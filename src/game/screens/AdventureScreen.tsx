import { useState } from "react";
import { adventureLevel, CHAPTERS, expeditionProgress, storyMoment } from "~/game/adventure";
import { useGame } from "~/game/store";
import { WorldScene } from "~/game/WorldScene";

export function AdventureScreen({
  onBack,
  onPlay,
}: {
  onBack: () => void;
  onPlay: (level: number) => void;
}) {
  const current = useGame((s) => s.adventureLevel);
  const results = useGame((s) => s.adventureResults);
  const [selected, setSelected] = useState(Math.min(4, Math.floor((current - 1) / 20)));
  const next = adventureLevel(current);
  const chapter = CHAPTERS[selected]!;
  const completed = Math.min(20, Math.max(0, current - 1 - selected * 20));
  const moment = storyMoment(Math.min(100, Math.floor((current - 1) / 5) * 5));
  const stars = Object.values(results).reduce((sum, r) => sum + r.stars, 0);
  const expedition = current > 100 ? expeditionProgress(current, results) : null;
  return (
    <div className="sn-page sn-adventure">
      <header className="sn-page-head">
        <button type="button" className="sn-pill" onClick={onBack}>
          ← Home
        </button>
        <span>Your adventure</span>
        <span className="tnum">★ {stars}</span>
      </header>
      <main className="sn-page-body">
        <span className="sn-home-eyebrow">FIVE PLACES. ONE CONNECTED WORLD.</span>
        <h1 className="sn-adventure-title">
          Little rescues.
          <br />A world restored.
        </h1>
        <p className="sn-sub">
          100 story levels, then endless expeditions. Every attempt is yours to take.
        </p>
        <button type="button" className="sn-adventure-continue" onClick={() => onPlay(current)}>
          <span>
            Continue adventure
            <strong>
              {next.expedition
                ? `Expedition ${Math.floor((current - 101) / 20) + 1} · stage ${((current - 101) % 20) + 1}`
                : `Level ${current} · ${next.chapter.name}`}
            </strong>
          </span>
          <span aria-hidden="true">▶</span>
        </button>
        <div className="sn-chapter-tabs" role="tablist" aria-label="Story chapters">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.name}
              type="button"
              role="tab"
              aria-selected={selected === i}
              aria-controls="chapter-panel"
              id={`chapter-tab-${i}`}
              onClick={() => setSelected(i)}
            >
              <span>{i + 1}</span>
              <small>{c.name}</small>
            </button>
          ))}
        </div>
        <section
          id="chapter-panel"
          role="tabpanel"
          aria-labelledby={`chapter-tab-${selected}`}
          style={{ color: chapter.color }}
        >
          <WorldScene chapter={selected} restored={completed} />
          <div className="sn-chapter-title">
            <div>
              <span className="sn-home-eyebrow">
                CHAPTER {selected + 1} · {completed}/20 RESTORED
              </span>
              <h2>{chapter.name}</h2>
            </div>
            <span>{completed === 20 ? "✓" : `${Math.round((completed / 20) * 100)}%`}</span>
          </div>
          <p className="sn-sub">{chapter.mission} A new story moment unfolds every five levels.</p>
          <div className="sn-level-grid">
            {Array.from({ length: 20 }, (_, offset) => {
              const level = selected * 20 + offset + 1;
              const result = results[level];
              return (
                <button
                  key={level}
                  type="button"
                  disabled={level > current}
                  data-current={level === current || undefined}
                  data-done={!!result || undefined}
                  onClick={() => onPlay(level)}
                  aria-label={`Level ${level}${result ? `, ${result.stars} stars` : level > current ? ", locked" : ", next"}`}
                >
                  <strong>{level}</strong>
                  <small>
                    {result
                      ? "★".repeat(result.stars)
                      : level % 5 === 0
                        ? "Story"
                        : level > current
                          ? "·"
                          : "Play"}
                  </small>
                </button>
              );
            })}
          </div>
        </section>
        {moment && (
          <aside className="sn-story-moment">
            <span className="sn-home-eyebrow">THE STORY SO FAR · {moment.chapter}</span>
            <h3>{moment.title}</h3>
            <p>{moment.text}</p>
          </aside>
        )}
        {expedition && (
          <section className="sn-story-moment">
            <span className="sn-home-eyebrow">BEYOND THE SPRING</span>
            <h3>Expedition {expedition.number}: bring everyone together.</h3>
            <p>
              {expedition.rescued}/20 rescues · {expedition.found}/{expedition.friends.length}{" "}
              friends found · {expedition.stars}/{expedition.starGoal} stars toward your optional
              goal.
            </p>
            <p>
              {expedition.friends
                .map((friend) => `${friend.found ? "✓ " : ""}${friend.name}`)
                .join(" · ")}
            </p>
            <p>
              Reunite these friends across a new sequence of puzzles. Every expedition has its own
              collection to complete.
            </p>
            <button type="button" className="sn-pill" onClick={() => onPlay(current)}>
              Start next expedition stage →
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
