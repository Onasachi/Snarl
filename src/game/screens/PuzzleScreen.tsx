import { type ReactNode, useEffect } from "react";
import type { Pt } from "~/engine";
import { NameCard } from "~/game/NameCard";
import { RescueActions, type RescueControls, type SolveStats } from "~/game/RescueActions";
import { runPoints } from "~/game/results";
import { ToolButton } from "~/game/Tools";
import { type UsePuzzleOptions, usePuzzle } from "~/game/usePuzzle";
import { CreatureSvg } from "~/render/CreatureSvg";
import { Icon } from "~/render/Icon";

export interface PuzzleScreenProps extends UsePuzzleOptions {
  /** "World 1 · 3", or "Tutorial · 1 of 2". */
  caption: string;
  /** Shown under the board while playing. */
  hint?: string;
  /** Overrides the name card's chips. The Daily Snarl says what it is, not how it went. */
  chips?: readonly string[];
  nudgesLeft: number;
  /** Label on the name card's button. */
  nextLabel: string;
  /**
   * Called with the move count and the board as the player left it. The weekly knot sends
   * that drawing to the contract, so it is theirs on chain rather than a layout the game
   * supplied for them.
   */
  onNext: (moves: number, pos: readonly Pt[], stats: SolveStats) => void;
  /** Leave an unfinished knot; its starting layout can be tried again later. */
  onBack?: () => void;
  onPond?: ((moves: number, pos: readonly Pt[], stats: SolveStats) => void) | undefined;
  /** Draws attention to Nudge the first time it is available. */
  highlightNudge?: boolean;
  showNudge?: boolean;
  /** Rendered above the tools. */
  toast?: ReactNode;
  /**
   * "Almost free." replaces the hint at two crossings or fewer. The first tutorial knot
   * turns it off: Bub never has more than one crossing, so the instruction the player
   * actually needs would never get a chance to show.
   */
  almostFree?: boolean;
  onSolved?: () => void;
  rescue?: RescueControls | undefined;
  supplies?: { guide: number; glimpse: number; onShop: () => void };
}

export function PuzzleScreen({
  caption,
  hint = "",
  chips,
  nextLabel,
  onNext,
  onPond,
  onBack,
  highlightNudge = false,
  showNudge = true,
  almostFree = true,
  toast,
  onSolved,
  rescue,
  supplies,
  ...options
}: PuzzleScreenProps) {
  const p = usePuzzle(options);
  const { creature } = options;
  const solution = p.solution ?? p.pos;
  const stats = { initialCrossings: p.initialCrossings, assisted: p.assisted };

  useEffect(() => {
    if (p.phase === "free") onSolved?.();
  }, [p.phase, onSolved]);

  const nearlyThere = almostFree && p.crossingCount > 0 && p.crossingCount <= 2;
  const liveHint = p.phase === "play" ? (nearlyThere ? "Almost free." : hint) : "";

  const shownChips =
    chips ??
    (p.assisted
      ? ["Freed with a little help"]
      : p.underPar
        ? ["Shell earned · under par"]
        : [`Freed in ${p.moves} moves`]);

  return (
    <>
      <header style={{ padding: "calc(16px + env(safe-area-inset-top)) 20px 0" }}>
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
        >
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={p.phase !== "play"}
              aria-label="Leave puzzle"
              title="Leave puzzle. This knot restarts when you return."
              style={{
                display: "grid",
                placeItems: "center",
                minWidth: 44,
                minHeight: 44,
                border: "1px solid var(--card-line)",
                borderRadius: "50%",
                background: "transparent",
                color: "var(--ink2)",
                cursor: "pointer",
                opacity: p.phase === "play" ? 1 : 0.4,
              }}
            >
              <Icon name="chevron" size={16} style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
          <span
            style={{
              flex: 1,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink2)",
            }}
          >
            {caption}
          </span>
          <span className="tnum" style={{ fontSize: 13, color: "var(--ink2)" }}>
            {p.moves} · par {creature.par}
          </span>
        </div>

        <p style={{ margin: "5px 0 0", color: "var(--ink2)", fontSize: 12 }}>
          {p.initialCrossings} starting crossings · {p.initialCrossings * 10} points
          {" · +25 under par without help"}
        </p>

        {/* The board itself is a drawing a screen reader cannot usefully walk, so the
            count is the thing that speaks, and it speaks whenever it changes. */}
        <div
          role="status"
          aria-live="polite"
          style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}
        >
          <span className="sr-only">
            {creature.name}: {p.crossingCount} {p.crossingCount === 1 ? "crossing" : "crossings"}{" "}
            left
          </span>
          <span
            aria-hidden="true"
            className="tnum"
            style={{
              fontSize: 44,
              fontWeight: 600,
              lineHeight: 1,
              color: p.crossingCount ? "var(--warm)" : "var(--ink)",
              transition: "color .4s ease",
            }}
          >
            {p.crossingCount}
          </span>
          <span aria-hidden="true" style={{ fontSize: 15, color: "var(--ink2)" }}>
            {p.crossingCount === 1 ? "crossing" : "crossings"}
          </span>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 12px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            position: "relative",
            aspectRatio: "1 / 1",
            maxHeight: "100%",
            transform: p.phase === "inhale" ? "scale(0.95)" : "scale(1)",
            transition: "transform .42s cubic-bezier(.3,.7,.3,1)",
          }}
        >
          <CreatureSvg
            creature={creature}
            pos={p.pos}
            state={p.free ? "free" : "tangled"}
            crossings={p.crossings}
            eyes={p.eyes}
            calm={p.calm}
            nudge={p.nudge}
            sparkles={p.sparkles}
            drag={p.drag}
            dropped={p.dropped}
            dropKey={p.dropKey}
            hand={p.hand}
            slowShiver={p.slowShiver}
            r={4.6}
            sw={1.6}
            hit={6.8}
            svgRef={p.svgRef}
            onBeadDown={p.phase === "play" ? p.onBeadDown : undefined}
            onBeadKeyDown={p.phase === "play" ? p.onBeadKeyDown : undefined}
            onBeadFocus={p.phase === "play" ? p.onBeadFocus : undefined}
            onPointerMove={p.onPointerMove}
            onPointerUp={p.onPointerUp}
            onPointerCancel={p.onPointerUp}
          />
          {p.glimpse && (
            <div
              role="img"
              aria-label="Untangled shape preview"
              style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5 }}
            >
              <CreatureSvg
                creature={creature}
                pos={p.home}
                state="free"
                eyes="open"
                r={4.6}
                sw={1.6}
                still
              />
            </div>
          )}
        </div>
      </main>

      <p
        style={{
          minHeight: 22,
          margin: 0,
          textAlign: "center",
          fontSize: 15,
          color: "var(--ink2)",
          opacity: liveHint ? 1 : 0,
          transition: "opacity .3s",
        }}
      >
        {liveHint || " "}
      </p>

      <div
        data-bottom-stack
        aria-hidden={p.phase !== "play"}
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 10,
          padding: "16px 20px calc(20px + env(safe-area-inset-bottom))",
          opacity: p.phase === "play" ? 1 : 0,
          pointerEvents: p.phase === "play" ? "auto" : "none",
          transition: "opacity .3s",
        }}
      >
        {toast}
        <ToolButton onClick={p.undo} dim={!p.canUndo} disabled={!p.canUndo || p.phase !== "play"}>
          Undo
        </ToolButton>
        <ToolButton onClick={p.toggleCalm} active={p.calm} disabled={p.phase !== "play"}>
          Calm view
        </ToolButton>
        {showNudge && (
          <ToolButton
            onClick={p.requestNudge}
            attention={highlightNudge}
            dim={options.nudgesLeft === 0}
            disabled={p.phase !== "play"}
          >
            Hint <span className="tnum">{options.nudgesLeft}</span>
          </ToolButton>
        )}
        {supplies && (
          <div className="sn-puzzle-boosts" style={{ flexBasis: "100%" }}>
            <button
              type="button"
              disabled={p.phase !== "play"}
              onClick={supplies.guide ? p.useGuide : supplies.onShop}
            >
              ↗ Helping hand · {supplies.guide || "G$"}
            </button>
            <button
              type="button"
              disabled={p.glimpse || p.phase !== "play"}
              onClick={supplies.glimpse ? p.useGlimpse : supplies.onShop}
            >
              ◉ Firefly vision · {supplies.glimpse || "G$"}
            </button>
            <button type="button" disabled={p.phase !== "play"} onClick={supplies.onShop}>
              Shop G$ →
            </button>
          </div>
        )}
      </div>

      {p.card && (
        <NameCard
          creature={creature}
          chips={[
            ...shownChips,
            `${p.initialCrossings} crossings cleared · ${runPoints(p.initialCrossings, p.moves, creature.par, p.assisted)} pts`,
          ]}
          actionLabel={nextLabel}
          onAction={() => onNext(p.moves, solution, stats)}
          onPond={onPond ? () => onPond(p.moves, solution, stats) : undefined}
          actions={
            rescue && (
              <RescueActions
                key={rescue.account?.address ?? "disconnected"}
                controls={rescue}
                moves={p.moves}
                solution={solution}
                stats={stats}
                nextLabel={nextLabel}
                onContinue={() => onNext(p.moves, solution, stats)}
                onPond={onPond ? () => onPond(p.moves, solution, stats) : undefined}
              />
            )
          }
        />
      )}
    </>
  );
}
