/** Each chapter restores another layer of the same connected waterway. */
export function WorldScene({
  chapter,
  restored = 0,
  compact = false,
}: {
  chapter: number;
  restored?: number;
  compact?: boolean;
}) {
  const progress = Math.min(4, Math.floor(restored / 5));
  return (
    <svg
      className="sn-world-scene"
      viewBox={compact ? "0 0 350 130" : "0 0 350 160"}
      role="img"
      aria-label={
        ["Quiet pond", "Reed garden", "Firefly marsh", "Moonlit lake", "Hidden spring"][chapter]
      }
    >
      <g transform={compact ? "translate(0,-30)" : undefined}>
        <path
          d="M0 103Q40 67 79 90T166 78T253 88T350 65V160H0Z"
          fill="currentColor"
          opacity=".12"
        />
        <path d="M0 135Q70 107 124 121T223 112T350 118V160H0Z" fill="currentColor" opacity=".24" />
        <ellipse
          cx="177"
          cy="115"
          rx="120"
          ry="30"
          fill={compact ? "var(--home-water, var(--bg))" : "var(--bg)"}
          opacity=".7"
        />
        <g fill="none" stroke="currentColor" strokeWidth="1.4" opacity=".6">
          <ellipse cx="177" cy="115" rx="90" ry="20" />
          <path d="M94 113q25-9 43-2m62 16q25 3 43-5" />
        </g>
        {chapter >= 1 && (
          <g stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M40 129q-4-42-15-54m18 55q2-55 19-73m-17 76q13-31 26-39M294 132q-3-52 12-72m-14 72q-18-45-26-45" />
          </g>
        )}
        {chapter >= 3 && (
          <>
            <circle cx="263" cy="34" r="20" fill="currentColor" opacity=".8" />
            <path d="M262 63l-13 29m22-18-8 18" stroke="currentColor" opacity=".3" />
          </>
        )}
        {chapter === 4 && (
          <>
            <path
              d="M126 93Q137 20 177 20T233 93"
              fill="var(--bg2)"
              stroke="currentColor"
              opacity=".8"
            />
            <path d="M157 90Q171 43 184 43T209 92" fill="var(--bg)" />
            <path
              d="M182 76q-17 35-7 58"
              stroke="currentColor"
              strokeWidth={3 + progress * 2}
              fill="none"
              opacity=".65"
            />
          </>
        )}
        {Array.from({ length: progress + 1 }, (_, i) => i).map((i) => (
          <path
            key={i}
            d={`M${82 + i * 46} ${116 + (i % 2) * 12}a12 5 0 1 0 2-1l-2 1 6 3Z`}
            fill="currentColor"
            opacity=".65"
          />
        ))}
        {chapter === 2 &&
          Array.from({ length: 4 + progress * 5 }, (_, i) => i).map((i) => (
            <circle
              key={i}
              className="sn-world-light"
              cx={25 + ((i * 61) % 300)}
              cy={20 + ((i * 31) % 91)}
              r={1.5 + (i % 3) * 0.5}
              fill="currentColor"
              style={{ animationDelay: `${i * -0.7}s` }}
            />
          ))}
        {progress >= 3 && (
          <g fill="currentColor">
            <path d="M117 113q-13-11-5-16 8 3 5 16-1-17 7-17 6 9-7 17Z" />
            <path d="M237 133q-13-11-5-16 8 3 5 16-1-17 7-17 6 9-7 17Z" />
          </g>
        )}
      </g>
    </svg>
  );
}
