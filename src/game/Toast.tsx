import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef(0);

  const show = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    timer.current = window.setTimeout(() => setMessage(null), 2800);
  }, []);

  return { message, show };
}

/**
 * Sits directly above whatever the screen keeps at its bottom — the pond's cards, the
 * puzzle's tools — by being a child of that stack and anchored to its top edge.
 *
 * No measuring. An earlier version read the stack's height and positioned itself from it,
 * which raced: the claim card grows a line when a balance arrives, in the same breath as
 * the toast that announces it, and the toast ended up sitting on the card it was about.
 */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: "100%",
        marginBottom: 12,
        padding: "12px 16px",
        borderRadius: 14,
        background: "var(--bg2)",
        border: "1px solid var(--card-line)",
        color: "var(--ink)",
        fontSize: 15,
        textAlign: "center",
        animation: "sn-up .3s ease-out",
      }}
    >
      {message}
    </div>
  );
}
