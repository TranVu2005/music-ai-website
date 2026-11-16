"use client";

import { createContext, useContext } from "react";
import { useAudioPlayer, type AudioPlayerApi } from "./useAudioPlayer";

const AudioPlayerContext = createContext<AudioPlayerApi | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer();
  return <AudioPlayerContext.Provider value={player}>{children}</AudioPlayerContext.Provider>;
}

export function usePlayer(): AudioPlayerApi {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) {
    throw new Error("usePlayer must be used inside <AudioPlayerProvider>");
  }
  return ctx;
}
