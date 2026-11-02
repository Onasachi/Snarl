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

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: 108,
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
