import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchCalendar } from "~/hooks/useCalendar";

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", Object.assign(new EventTarget(), { setTimeout, clearTimeout }));
  vi.stubGlobal("document", new EventTarget());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("the returning player's calendar", () => {
  it("unlocks a new day and week at local Monday midnight without reloading", () => {
    vi.setSystemTime(new Date(2026, 10, 8, 23, 59, 59));
    const changed = vi.fn();
    const stop = watchCalendar(changed);
    expect(changed).toHaveBeenLastCalledWith({ today: "2026-11-08", week: "2026-W45" });
    vi.advanceTimersByTime(1_050);
    expect(changed).toHaveBeenLastCalledWith({ today: "2026-11-09", week: "2026-W46" });
    stop();
  });

  it.each(["focus", "visibilitychange"])("catches up on %s after the phone was asleep", (event) => {
    vi.setSystemTime(new Date(2026, 10, 5, 9));
    const changed = vi.fn();
    const stop = watchCalendar(changed);
    vi.setSystemTime(new Date(2026, 10, 10, 9));
    (event === "focus" ? window : document).dispatchEvent(new Event(event));
    expect(changed).toHaveBeenLastCalledWith({ today: "2026-11-10", week: "2026-W46" });
    expect(vi.getTimerCount()).toBe(1);
    stop();
  });

  it("removes its timer and listeners on leaving", () => {
    const changed = vi.fn();
    const stop = watchCalendar(changed);
    stop();
    changed.mockClear();
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(changed).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
