"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicTrack } from "../../lib/api/serialization";

export type PlayerTrack = Pick<
  PublicTrack,
  "id" | "slug" | "title" | "genre" | "mood" | "previewFileUrl" | "coverImageUrl" | "durationSeconds"
>;

export type PlayerStatus = "idle" | "loading" | "playing" | "paused";

export type AudioPlayerState = {
  track: PlayerTrack | null;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: boolean;
};

export type AudioPlayerApi = AudioPlayerState & {
  play: (track: PlayerTrack) => void;
  pause: () => void;
  toggle: (track: PlayerTrack) => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
};

const INITIAL: AudioPlayerState = {
  track: null,
  status: "idle",
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  error: false,
};

/**
 * Owns the single shared HTMLAudioElement. Because there is exactly one element,
 * starting any track necessarily stops the previous one.
 */
export function useAudioPlayer(): AudioPlayerApi {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackIdRef = useRef<string | null>(null);
  const [state, setState] = useState<AudioPlayerState>(INITIAL);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const patch = (partial: Partial<AudioPlayerState>) =>
      setState((prev) => ({ ...prev, ...partial }));

    const onPlaying = () => patch({ status: "playing", error: false });
    const onWaiting = () => patch({ status: "loading" });
    const onPause = () => setState((prev) => (prev.status === "idle" ? prev : { ...prev, status: "paused" }));
    const onEnded = () => patch({ status: "paused", currentTime: 0 });
    const onTimeUpdate = () => patch({ currentTime: audio.currentTime });
    const onDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        patch({ duration: audio.duration });
      }
    };
    const onVolume = () => patch({ volume: audio.volume, muted: audio.muted });
    const onError = () => patch({ status: "paused", error: true });

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("volumechange", onVolume);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("volumechange", onVolume);
      audio.removeEventListener("error", onError);
      audio.removeAttribute("src");
      audioRef.current = null;
    };
  }, []);

  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        setState((prev) => ({ ...prev, status: "paused", error: true }));
      });
    }
  }, []);

  const play = useCallback(
    (track: PlayerTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (trackIdRef.current !== track.id) {
        trackIdRef.current = track.id;
        // Stop whatever is playing before switching sources.
        audio.pause();
        audio.src = track.previewFileUrl;
        setState((prev) => ({
          ...prev,
          track,
          status: "loading",
          currentTime: 0,
          duration: track.durationSeconds,
          error: false,
        }));
      } else {
        setState((prev) => ({ ...prev, status: "loading", error: false }));
      }
      startPlayback(audio);
    },
    [startPlayback]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(
    (track: PlayerTrack) => {
      const audio = audioRef.current;
      if (!audio) return;
      const isCurrent = state.track?.id === track.id;
      if (isCurrent && (state.status === "playing" || state.status === "loading")) {
        audio.pause();
        return;
      }
      play(track);
    },
    [play, state.track?.id, state.status]
  );

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, seconds);
    audio.currentTime = target;
    setState((prev) => ({ ...prev, currentTime: target }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const audio = audioRef.current;
    const clamped = Math.min(1, Math.max(0, volume));
    if (audio) {
      audio.volume = clamped;
      audio.muted = clamped === 0;
    }
    setState((prev) => ({ ...prev, volume: clamped, muted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const muted = !audio.muted;
    audio.muted = muted;
    setState((prev) => ({ ...prev, muted }));
  }, []);

  return { ...state, play, pause, toggle, seek, setVolume, toggleMute };
}
