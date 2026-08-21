"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  normalizePalettePreference,
  PALETTE_STORAGE_KEY,
  type PaletteId,
} from "@/lib/settings/preferences";

type PaletteContextValue = {
  palette: PaletteId;
  setPalette: (palette: PaletteId) => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

function readStoredPalette(): PaletteId {
  if (typeof window === "undefined") return "teal";
  try {
    return normalizePalettePreference(
      window.localStorage.getItem(PALETTE_STORAGE_KEY),
    );
  } catch {
    return "teal";
  }
}

function applyPaletteAttribute(palette: PaletteId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-palette", palette);
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [palette, setPaletteState] = useState<PaletteId>("teal");

  useEffect(() => {
    const stored = readStoredPalette();
    setPaletteState(stored);
    applyPaletteAttribute(stored);
  }, []);

  const setPalette = useCallback((next: PaletteId) => {
    setPaletteState(next);
    applyPaletteAttribute(next);
    try {
      window.localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, []);

  const value = useMemo(
    () => ({ palette: mounted ? palette : "teal", setPalette }),
    [mounted, palette, setPalette],
  );

  return (
    <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>
  );
}

export function usePalette(): PaletteContextValue {
  const context = useContext(PaletteContext);
  if (!context) {
    throw new Error("usePalette must be used within PaletteProvider");
  }
  return context;
}
