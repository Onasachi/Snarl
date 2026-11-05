import { useEffect, useState } from "react";
import { msUntilTomorrow } from "~/game/daily";
import { dayKey } from "~/game/progress";
import { weekKey } from "~/game/weekly";

const calendarNow = () => {
  const now = new Date();
  return { today: dayKey(now), week: weekKey(now) };
};

/** Refresh at local midnight and after a suspended phone tab returns. */
export function watchCalendar(onChange: (calendar: ReturnType<typeof calendarNow>) => void) {
  let timer: number;
  const refresh = () => {
    onChange(calendarNow());
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, msUntilTomorrow() + 50);
  };
  refresh();
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearTimeout(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}

export function useCalendar(paused = false) {
  const [calendar, setCalendar] = useState(calendarNow);
  useEffect(() => {
    return watchCalendar((next) => {
      // Keep an open puzzle's seed and reporting date stable until the player leaves it.
      if (!paused) {
        setCalendar((previous) =>
          previous.today === next.today && previous.week === next.week ? previous : next,
        );
      }
    });
  }, [paused]);

  return calendar;
}
