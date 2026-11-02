import type { ReactNode } from "react";

/** Every tool is a 44pt target, the smallest thing a thumb should have to find. */
export function ToolButton({
  children,
  onClick,
  disabled = false,
  active = false,
  dim = false,
  attention = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  dim?: boolean;
  attention?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: 44,
        padding: "0 18px",
        borderRadius: 14,
        border: `1px solid ${active ? "var(--ink)" : "var(--card-line)"}`,
        background: "transparent",
        color: "var(--ink)",
        fontSize: 15,
        fontWeight: 500,
        opacity: dim ? 0.45 : 1,
        cursor: disabled ? "default" : "pointer",
        animation: attention ? "sn-attn 1.4s ease-in-out infinite" : "none",
      }}
    >
      {children}
    </button>
  );
}
