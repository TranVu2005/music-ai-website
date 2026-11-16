// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { AudioPlayerProvider, usePlayer } from "../../src/components/player/AudioPlayerContext";
import { AudioPlayerBar } from "../../src/components/player/AudioPlayerBar";
import type { PlayerTrack } from "../../src/components/player/useAudioPlayer";
import { installAudioMock } from "./audio-mock";

const trackA: PlayerTrack = {
  id: "a",
  slug: "track-a",
  title: "Track A",
  genre: "Lo-fi Chill",
  mood: "Man mác",
  previewFileUrl: "/audio/previews/a.mp3",
  coverImageUrl: null,
  durationSeconds: 145,
};
const trackB: PlayerTrack = {
  ...trackA,
  id: "b",
  slug: "track-b",
  title: "Track B",
  previewFileUrl: "/audio/previews/b.mp3",
  durationSeconds: 200,
};

function Harness() {
  const player = usePlayer();
  return (
    <div>
      <button onClick={() => player.toggle(trackA)}>toggle-a</button>
      <button onClick={() => player.toggle(trackB)}>toggle-b</button>
      <output data-testid="state">{`${player.track?.id ?? "none"}:${player.status}`}</output>
    </div>
  );
}

function renderPlayer() {
  return render(
    <AudioPlayerProvider>
      <Harness />
      <AudioPlayerBar />
    </AudioPlayerProvider>
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("audio player", () => {
  let audio: ReturnType<typeof installAudioMock>;

  beforeEach(() => {
    audio = installAudioMock();
  });

  it("renders nothing until a track is chosen", () => {
    renderPlayer();
    expect(screen.queryByRole("region", { name: "Trình phát nhạc" })).toBeNull();
    expect(state()).toBe("none:idle");
  });

  it("play/pause toggle changes playback state", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("toggle-a"));
    expect(state()).toBe("a:playing");
    expect(audio.play).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Tạm dừng" }));
    expect(state()).toBe("a:paused");
    expect(audio.pause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Phát" }));
    expect(state()).toBe("a:playing");
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it("seek updates playback time", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("toggle-a"));

    const slider = screen.getByRole("slider", { name: "Tiến độ phát" });
    fireEvent.change(slider, { target: { value: "55" } });

    expect(slider).toHaveValue("55");
    expect(screen.getAllByText("0:55").length).toBeGreaterThan(0);
  });

  it("selecting a second track pauses the first and starts the second", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("toggle-a"));
    expect(state()).toBe("a:playing");
    const pausesBefore = audio.pause.mock.calls.length;

    fireEvent.click(screen.getByText("toggle-b"));

    expect(audio.pause.mock.calls.length).toBeGreaterThan(pausesBefore); // first stopped explicitly
    expect(state()).toBe("b:playing");
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Track B")).toBeInTheDocument();
    expect(screen.queryByText("Track A")).toBeNull();

    // Only one element ever plays: the shared audio element now points at track B.
    const playedElements = new Set(audio.play.mock.contexts as HTMLAudioElement[]);
    expect(playedElements.size).toBe(1);
    const el = [...playedElements][0];
    expect(el.getAttribute("src")).toBe("/audio/previews/b.mp3");
  });

  it("volume and mute controls update the audio element", () => {
    renderPlayer();
    fireEvent.click(screen.getByText("toggle-a"));
    const el = audio.play.mock.contexts[0] as HTMLAudioElement;

    fireEvent.change(screen.getByRole("slider", { name: "Âm lượng" }), { target: { value: "40" } });
    expect(el.volume).toBeCloseTo(0.4);

    fireEvent.click(screen.getByRole("button", { name: "Tắt tiếng" }));
    expect(el.muted).toBe(true);
    expect(screen.getByRole("button", { name: "Bật tiếng" })).toBeInTheDocument();
  });

  it("shows an error when playback is rejected", async () => {
    audio.play.mockImplementationOnce(() => Promise.reject(new Error("blocked")));
    renderPlayer();
    await act(async () => {
      fireEvent.click(screen.getByText("toggle-a"));
    });
    expect(state()).toBe("a:paused");
    expect(screen.getByRole("alert")).toHaveTextContent("Không thể phát bài này lúc này.");
  });
});
