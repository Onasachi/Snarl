import { useMemo } from "react";
import { creatureColor } from "~/data";
import { crossings, scramble } from "~/engine";
import { useGame } from "~/game/store";
import { endsLabel, WEEKLY_CREATURE, weeklySeed } from "~/game/weekly";
import { CreatureSvg } from "~/render/CreatureSvg";

/**
 * Screen 15: the week's knot. Everyone gets the same tangle until Sunday, and inside it is
 * Glint, who is only ever found this way.
 *
 * What it pays is a creature, not money — PLAN.md has the reasoning. A prize made of the
 * game's own currency needs no treasury and no contract, and cannot be farmed for
 * anything, which is also what makes the shared total safe to add later.
 */
export function GreatUntangle({
  week,
  onAddSolve,
  onBack,
}: {
  week: string;
  onAddSolve: () => void;
  onBack: () => void;
}) {
  const solves = useGame((s) => s.weeklySolves);
  const storedWeek = useGame((s) => s.weeklyWeek);
  const earnedWeek = useGame((s) => s.weeklyEarnedWeek);
  const mine = storedWeek === week ? solves : 0;
  const earned = earnedWeek === week;

  const { art, startingCrossings } = useMemo(() => {
    const pos = scramble(WEEKLY_CREATURE, weeklySeed(week), 10);
    return {
      art: pos,
      startingCrossings: pos ? crossings(pos, WEEKLY_CREATURE.edges).length : 0,
    };
  }, [week]);

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "calc(12px + env(safe-area-inset-top)) 16px 4px",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            minHeight: 44,
            padding: "0 14px",
            border: "1px solid var(--card-line)",
            borderRadius: 999,
            background: "transparent",
            color: "var(--ink2)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Pond
        </button>
        <span
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink2)",
          }}
        >
          {endsLabel()}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "grid",
          alignContent: "center",
          gap: 6,
          padding: "0 24px",
          minHeight: 0,
        }}
      >
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink2)",
            margin: 0,
          }}
        >
          This week's community knot
        </p>
        <h2 style={{ fontSize: 30, fontWeight: 600, margin: "0 0 10px" }}>The Great Untangle</h2>

        <div style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: 280, justifySelf: "center" }}>
          {earned && (
            <CreatureSvg creature={WEEKLY_CREATURE} state="free" eyes="open" r={4} sw={1.6} />
          )}
          {!earned && art && (
            <CreatureSvg
              creature={WEEKLY_CREATURE}
              pos={art}
              state="tangled"
              crossings={crossings(art, WEEKLY_CREATURE.edges)}
              eyes="shut"
              r={2.6}
              sw={0.9}
              still
            />
          )}
        </div>

        <dl
          style={{ display: "flex", justifyContent: "space-between", gap: 16, margin: "14px 0 0" }}
        >
          <div>
            <dt
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              Your passes
            </dt>
            <dd className="tnum" style={{ fontSize: 30, fontWeight: 600, margin: 0 }}>
              {mine}
            </dd>
          </div>
          <div style={{ textAlign: "right" }}>
            <dt
              style={{
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--ink2)",
              }}
            >
              {earned ? "Freed" : "Crossings"}
            </dt>
            <dd
              className="tnum"
              style={{
                fontSize: 30,
                fontWeight: 600,
                margin: 0,
                color: earned ? creatureColor(WEEKLY_CREATURE, "night") : "var(--ink)",
              }}
            >
              {earned ? WEEKLY_CREATURE.name : startingCrossings}
            </dd>
          </div>
        </dl>

        <p style={{ fontSize: 13, lineHeight: 1.4, color: "var(--ink2)", margin: "12px 0 0" }}>
          {earned
            ? `${WEEKLY_CREATURE.name} is in your pond. Another one is tangled up in next week's knot.`
            : `Everyone gets this same knot until Sunday. Free it once and ${WEEKLY_CREATURE.name} is yours to keep.`}
        </p>
      </main>

      <footer
        data-bottom-stack
        style={{
          position: "relative",
          padding: "12px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onAddSolve}
          style={{
            width: "100%",
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
          {earned ? "Untangle it again" : "Untangle it"}
        </button>
      </footer>
    </>
  );
}
