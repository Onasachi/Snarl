import { Icon, type IconName } from "~/render/Icon";

/**
 * One thing to go and do, as a tile rather than another full-width row.
 *
 * The pond used to stack four of these down the bottom third: a pill for the week, a wide
 * card for the day, the G$ card, and Play. Four bars of text under a near-empty pond read
 * as a settings list with a picture above it. Two of them side by side read as somewhere
 * to go.
 */
export function ActivityTile({
  icon,
  label,
  status,
  tone = "plain",
  onClick,
}: {
  icon: IconName;
  label: string;
  /** The one line that says whether this wants attention. */
  status: string;
  /** "done" for something already finished today, which should rest. */
  tone?: "plain" | "done";
  onClick: () => void;
}) {
  const done = tone === "done";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "grid",
        gap: 4,
        justifyItems: "start",
        minHeight: 76,
        padding: "12px 14px",
        border: "1px solid var(--card-line)",
        borderRadius: 18,
        background: "var(--card)",
        color: "var(--ink)",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: done ? "var(--ink2)" : "var(--ink)",
        }}
      >
        <Icon name={done ? "check" : icon} size={18} />
        <span style={{ fontSize: 15, fontWeight: 500 }}>{label}</span>
      </span>
      <span style={{ fontSize: 12.5, lineHeight: 1.3, color: "var(--ink2)" }}>{status}</span>
    </button>
  );
}
