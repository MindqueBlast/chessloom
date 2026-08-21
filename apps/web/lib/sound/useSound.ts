"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  SOUND_STORAGE_KEY,
  normalizeSoundEnabled,
} from "@/lib/settings/preferences";

export type SoundKind =
  | "move"
  | "correct"
  | "incorrect"
  | "reveal"
  | "sessionComplete"
  | "importSuccess";

type Tone = {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
};

const TONES: Record<SoundKind, Tone[]> = {
  move: [{ frequency: 420, duration: 0.04, type: "triangle", gain: 0.04 }],
  correct: [
    { frequency: 520, duration: 0.05, type: "sine", gain: 0.05 },
    { frequency: 680, duration: 0.07, type: "sine", gain: 0.04 },
  ],
  incorrect: [{ frequency: 180, duration: 0.1, type: "square", gain: 0.03 }],
  reveal: [{ frequency: 360, duration: 0.06, type: "triangle", gain: 0.035 }],
  sessionComplete: [
    { frequency: 440, duration: 0.06, type: "sine", gain: 0.045 },
    { frequency: 554, duration: 0.07, type: "sine", gain: 0.04 },
    { frequency: 659, duration: 0.1, type: "sine", gain: 0.04 },
  ],
  importSuccess: [
    { frequency: 480, duration: 0.05, type: "triangle", gain: 0.04 },
    { frequency: 640, duration: 0.08, type: "triangle", gain: 0.035 },
  ],
};

function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return normalizeSoundEnabled(
      window.localStorage.getItem(SOUND_STORAGE_KEY),
    );
  } catch {
    return false;
  }
}

function playTone(
  ctx: AudioContext,
  tone: Tone,
  when: number,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = tone.type;
  oscillator.frequency.value = tone.frequency;
  gain.gain.value = 0.0001;
  gain.gain.exponentialRampToValueAtTime(tone.gain, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(when);
  oscillator.stop(when + tone.duration + 0.02);
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const unlockedRef = useRef(false);

  useEffect(() => {
    const unlock = () => {
      unlockedRef.current = true;
      if (!ctxRef.current && typeof window !== "undefined") {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (AudioCtx) {
          ctxRef.current = new AudioCtx();
        }
      }
      void ctxRef.current?.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((kind: SoundKind) => {
    if (!soundEnabled() || !unlockedRef.current) return;
    const ctx = ctxRef.current;
    if (!ctx) return;
    void ctx.resume();
    let offset = 0;
    for (const tone of TONES[kind]) {
      playTone(ctx, tone, ctx.currentTime + offset);
      offset += tone.duration * 0.85;
    }
  }, []);

  return { play };
}
