import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  Ref,
} from "react";
import { creatureColor, creatureTint, type ThemeId, theme } from "~/data";
import type { Creature, Crossing, Nudge, Pt } from "~/engine";
import { solvedLayout } from "~/engine";
import { useReducedMotion } from "~/hooks/useReducedMotion";
import { useThemeId } from "~/theme/ThemeProvider";

export interface Sparkle {
  id: string;
  x: number;
  y: number;
}

export type CreatureState = "tangled" | "free" | "silhouette";
export type EyeState = "shut" | "one" | "open";

export interface CreatureSvgProps {
  creature: Creature;
  /** Defaults to the theme in force. Only a swatch needs to override it. */
  themeId?: ThemeId;
  /** Defaults to the solved layout, which is what a freed creature always wants. */
  pos?: readonly Pt[];
  state?: CreatureState;
  crossings?: readonly Crossing[];
  eyes?: EyeState;
  /** Calm view fades every string that is not crossing, down to a whisper. */
  calm?: boolean;
  nudge?: Nudge | null;
  sparkles?: readonly Sparkle[];
  /** Bead currently held. */
  drag?: number;
  /** Bead that just landed, with a key that changes to replay the bounce. */
  dropped?: number;
  dropKey?: number;
  /** The tutorial's drifting finger. */
  hand?: { from: Pt; to: Pt } | null;
  /** Bead radius and string width, in grid units. */
  r?: number;
  sw?: number;
  pad?: number;
  /** Invisible touch radius. 6.8 on a 390pt phone is comfortably past 44pt. */
  hit?: number;
  /** Decorative: no breathing, no shiver, no pulse, whatever the player's settings. */
  still?: boolean;
  /** Two or fewer crossings left: the creature calms down and peeks. */
  slowShiver?: boolean;
  onBeadDown?: (bead: number, e: ReactPointerEvent<SVGCircleElement>) => void;
  onBeadKeyDown?: (bead: number, e: ReactKeyboardEvent<SVGCircleElement>) => void;
  onBeadFocus?: (bead: number) => void;
  svgRef?: Ref<SVGSVGElement>;
  onPointerMove?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerCancel?: (e: ReactPointerEvent<SVGSVGElement>) => void;
  style?: CSSProperties;
}

/**
 * The whole drawing kit: strings, crossing rings, beads, eyes, the Nudge ghost and the
 * tutorial hand.
 *
 * Accessibility lives here rather than in the lint config: the board carries a <title>,
 * every bead is a focusable control with its own name and arrow-key handling, and a
 * decorative copy is hidden outright. Two a11y rules are turned off for this directory
 * because they match on string literals and on <button>, and neither can appear inside an
 * <svg>. One component draws the creature in every state it has — tangled on the
 * board, freed on a card, a silhouette for a Daily Snarl nobody has solved yet.
 */
export function CreatureSvg({
  creature,
  themeId,
  pos,
  state = "tangled",
  crossings = [],
  eyes,
  calm = false,
  nudge = null,
  sparkles = [],
  drag = -1,
  dropped = -1,
  dropKey = 0,
  hand = null,
  r = 3.1,
  sw = 1,
  pad = 10,
  hit,
  still = false,
  slowShiver = false,
  onBeadDown,
  onBeadKeyDown,
  onBeadFocus,
  svgRef,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  style,
}: CreatureSvgProps) {
  const reduce = useReducedMotion();
  const current = useThemeId();
  const id = themeId ?? current;
  const t = theme(id);
  const points = pos ?? solvedLayout(creature.nodes, pad);
  const free = state === "free";
  const silhouette = state === "silhouette";
  const animate = !still && !reduce;
  const color = creatureColor(creature, id);
  const tint = creatureTint(creature, id);
  const eyeState: EyeState = eyes ?? (free ? "open" : "shut");

  // Which edges are currently crossing something.
  const hotEdges = new Set<number>();
  for (const c of crossings) {
    hotEdges.add(c.i);
    hotEdges.add(c.j);
  }

  const shiver =
    animate && !free && !silhouette
      ? `sn-shiver ${slowShiver ? 1.6 : 0.42}s ease-in-out infinite`
      : "none";

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 100 100"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        overflow: "visible",
        touchAction: "none",
        ...style,
      }}
      {...(onBeadDown ? {} : { "aria-hidden": true as const })}
    >
      {/* Only the board is worth announcing; everywhere else this drawing sits beside text
          that already says what it is, and is hidden from assistive tech above. */}
      <title>
        {onBeadDown
          ? `${creature.name}, tangled. Move the beads so no strings cross.`
          : creature.name}
      </title>
      <g style={{ animation: shiver }}>
        {creature.edges.map((e, k) => {
          const a = points[e[0]]!;
          const b = points[e[1]]!;
          const isHot = !free && hotEdges.has(k);
          return (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: edges are a fixed authored list
              key={`e${k}`}
              x1={a[0]}
              y1={a[1]}
              x2={b[0]}
              y2={b[1]}
              strokeLinecap="round"
              style={{
                stroke: free ? tint : isHot ? t.warm : silhouette ? t.tangled : t.string,
                strokeWidth: isHot ? sw * 1.5 : sw,
                opacity: calm && !isHot && !free ? 0.16 : 0.9,
                transition: "stroke 1s ease, opacity .3s, stroke-width .2s",
              }}
            />
          );
        })}

        {nudge && (
          <>
            <line
              x1={points[nudge.i]![0]}
              y1={points[nudge.i]![1]}
              x2={nudge.to[0]}
              y2={nudge.to[1]}
              strokeLinecap="round"
              style={{
                stroke: t.ink,
                strokeWidth: sw * 0.55,
                strokeDasharray: "0.1 2.2",
                opacity: 0.7,
              }}
            />
            <circle
              cx={nudge.to[0]}
              cy={nudge.to[1]}
              r={r * 1.05}
              style={{
                fill: "none",
                stroke: t.ink,
                strokeWidth: sw * 0.5,
                strokeDasharray: "1 1",
                opacity: 0.85,
              }}
            />
          </>
        )}

        {/* A ring as well as the warm colour, so a crossing is never signalled by hue alone. */}
        {!free &&
          !silhouette &&
          crossings.map((c) => (
            <circle
              key={`x${c.i}_${c.j}`}
              cx={c.x}
              cy={c.y}
              r={r * 0.62}
              style={{
                fill: t.bg,
                stroke: t.warm,
                strokeWidth: sw * 0.55,
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: animate ? "sn-pulse 1.8s ease-in-out infinite" : "none",
              }}
            />
          ))}

        {sparkles.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={s.y}
            r={r * 0.8}
            style={{
              fill: "none",
              stroke: t.ink,
              strokeWidth: sw * 0.5,
              transformBox: "fill-box",
              transformOrigin: "center",
              animation: "sn-spark .7s ease-out forwards",
            }}
          />
        ))}

        {points.map((p, i) => {
          const isEye = i === creature.eye;
          const radius = isEye ? r * 1.32 : r;
          const lifted = drag === i;
          const nudged = nudge?.i === i;
          const open = (side: number) => eyeState === "open" || (eyeState === "one" && side < 0);

          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: beads are identified by index everywhere
            <g key={`n${i}`} transform={`translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`}>
              {lifted && (
                <circle
                  cx={0.5}
                  cy={1.6}
                  r={radius * 1.05}
                  style={{ fill: "#000", opacity: 0.22 }}
                />
              )}
              {nudged && (
                <circle
                  r={radius * 1.9}
                  style={{
                    fill: "none",
                    stroke: t.ink,
                    strokeWidth: sw * 0.55,
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation: animate ? "sn-pulse 1s ease-in-out infinite" : "none",
                  }}
                />
              )}

              <g
                key={`bead${dropped === i ? dropKey : ""}`}
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transform: lifted ? "scale(1.15)" : "scale(1)",
                  transition: "transform .18s cubic-bezier(.3,1.6,.5,1)",
                  animation: dropped === i && animate ? "sn-drop .38s ease-out" : "none",
                }}
              >
                <g
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "center",
                    animation:
                      animate && !lifted
                        ? `sn-breathe 2.2s ease-in-out ${(-i * 0.17).toFixed(2)}s infinite`
                        : "none",
                  }}
                >
                  <circle
                    r={radius}
                    style={{ fill: free ? color : t.tangled, transition: "fill 1.1s ease" }}
                  />
                  <circle
                    cx={-radius * 0.32}
                    cy={-radius * 0.36}
                    r={radius * 0.32}
                    style={{ fill: "#fff", opacity: free ? 0.42 : 0.16, transition: "opacity 1s" }}
                  />
                  {isEye &&
                    !silhouette &&
                    [-1, 1].map((side) =>
                      open(side) ? (
                        <circle
                          key={`eye${side}`}
                          cx={side * radius * 0.4}
                          cy={radius * 0.04}
                          r={radius * 0.2}
                          style={{ fill: t.eye }}
                        />
                      ) : (
                        <line
                          key={`eye${side}`}
                          x1={side * radius * 0.4 - radius * 0.17}
                          y1={radius * 0.04}
                          x2={side * radius * 0.4 + radius * 0.17}
                          y2={radius * 0.04}
                          strokeLinecap="round"
                          style={{ stroke: t.eye, strokeWidth: radius * 0.14 }}
                        />
                      ),
                    )}
                </g>
              </g>

              {onBeadDown && (
                <circle
                  r={hit ?? 6.5}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    i === creature.eye
                      ? `${creature.name}'s head bead`
                      : `${creature.name}, bead ${i + 1} of ${points.length}`
                  }
                  style={{ fill: "transparent", cursor: lifted ? "grabbing" : "grab" }}
                  onPointerDown={(e) => onBeadDown(i, e)}
                  onKeyDown={onBeadKeyDown ? (e) => onBeadKeyDown(i, e) : undefined}
                  onFocus={onBeadFocus ? () => onBeadFocus(i) : undefined}
                />
              )}
            </g>
          );
        })}

        {hand && <Hand from={hand.from} to={hand.to} ink={t.ink} />}
      </g>
    </svg>
  );
}

/** The tutorial's drifting finger: shown once, on the first knot, until the player grabs a bead. */
function Hand({ from, to, ink }: { from: Pt; to: Pt; ink: string }) {
  const values = (a: number, b: number) => `${a};${a};${b};${b}`;
  const keyTimes = "0;0.2;0.75;1";
  const anim = (name: "cx" | "cy", a: number, b: number) => (
    <animate
      attributeName={name}
      values={values(a, b)}
      keyTimes={keyTimes}
      dur="2.4s"
      repeatCount="indefinite"
    />
  );
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={from[0]} cy={from[1]} r={5} style={{ fill: ink, opacity: 0.18 }}>
        {anim("cx", from[0], to[0])}
        {anim("cy", from[1], to[1])}
      </circle>
      <circle cx={from[0]} cy={from[1]} r={2.2} style={{ fill: ink, opacity: 0.85 }}>
        {anim("cx", from[0], to[0])}
        {anim("cy", from[1], to[1])}
      </circle>
    </g>
  );
}
