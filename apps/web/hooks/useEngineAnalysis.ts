"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import {
  createStockfishClient,
  DEFAULT_ENGINE_DEPTH,
  type EngineEval,
} from "@/lib/engine/stockfish-client";

const BASE_THROTTLE_MS = 250;
const REDUCED_MOTION_THROTTLE_MS = 400;

export function useEngineAnalysis(
  fen: string,
  enabled: boolean,
  depth: number = DEFAULT_ENGINE_DEPTH,
): {
  eval: EngineEval | null;
  analyzing: boolean;
  error: string | null;
} {
  const reduceMotion = useReducedMotion();
  const throttleMs = reduceMotion ? REDUCED_MOTION_THROTTLE_MS : BASE_THROTTLE_MS;

  const [evalResult, setEvalResult] = useState<EngineEval | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<ReturnType<typeof createStockfishClient> | null>(
    null,
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !fen) {
      clientRef.current?.stop();
      setAnalyzing(false);
      setError(null);
      if (!enabled) {
        setEvalResult(null);
      }
      return;
    }

    const requestId = ++requestIdRef.current;
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void (async () => {
        if (!clientRef.current) {
          clientRef.current = createStockfishClient();
        }

        setAnalyzing(true);
        setError(null);

        try {
          const result = await clientRef.current.analyze(fen, depth);
          if (cancelled || requestId !== requestIdRef.current) {
            return;
          }
          setEvalResult(result);
        } catch (cause) {
          if (cancelled || requestId !== requestIdRef.current) {
            return;
          }
          if (
            cause instanceof Error &&
            cause.message === "Stockfish analysis stopped"
          ) {
            return;
          }
          setError(
            cause instanceof Error ? cause.message : "Engine analysis failed",
          );
        } finally {
          if (!cancelled && requestId === requestIdRef.current) {
            setAnalyzing(false);
          }
        }
      })();
    }, throttleMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      clientRef.current?.stop();
    };
  }, [depth, enabled, fen, throttleMs]);

  useEffect(() => {
    return () => {
      clientRef.current?.terminate();
      clientRef.current = null;
    };
  }, []);

  return { eval: evalResult, analyzing, error };
}
