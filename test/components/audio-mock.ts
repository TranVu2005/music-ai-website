import { vi } from "vitest";

/** Minimal HTMLMediaElement behaviour for jsdom (which does not implement playback). */
export function installAudioMock() {
  const state = new WeakMap<HTMLMediaElement, { time: number }>();
  const proto = window.HTMLMediaElement.prototype;
  const slot = (el: HTMLMediaElement) => {
    let s = state.get(el);
    if (!s) {
      s = { time: 0 };
      state.set(el, s);
    }
    return s;
  };

  const play = vi.spyOn(proto, "play").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("play"));
    this.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  const pause = vi.spyOn(proto, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event("pause"));
  });
  // Spies persist across tests (component unmount still calls pause()); reset history only.
  play.mockClear();
  pause.mockClear();
  Object.defineProperty(proto, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) {
      return slot(this).time;
    },
    set(this: HTMLMediaElement, value: number) {
      slot(this).time = value;
      this.dispatchEvent(new Event("timeupdate"));
    },
  });

  return { play, pause };
}
