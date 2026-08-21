export type ThemePreference = "light" | "dark" | "system";
export type DefaultSideMode = "white" | "black" | "both";
export type PaletteId = "teal" | "ocean" | "forest" | "graphite";

export const PALETTE_OPTIONS: Array<{
  id: PaletteId;
  label: string;
  swatch: string;
}> = [
  { id: "teal", label: "Teal", swatch: "oklch(0.55 0.12 190)" },
  { id: "ocean", label: "Ocean", swatch: "oklch(0.52 0.12 220)" },
  { id: "forest", label: "Forest", swatch: "oklch(0.52 0.11 170)" },
  { id: "graphite", label: "Graphite", swatch: "oklch(0.45 0.035 195)" },
];

export const PALETTE_STORAGE_KEY = "chessloom-palette";
export const SOUND_STORAGE_KEY = "chessloom-sound-enabled";
export const LEARN_AUTO_CONTINUE_KEY = "chessloom-learn-auto-continue";

export function normalizeThemePreference(value: unknown): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  throw new Error("Choose a supported theme");
}

export function normalizeDefaultSideMode(value: unknown): DefaultSideMode {
  if (value === "white" || value === "black" || value === "both") {
    return value;
  }
  throw new Error("Choose a supported default side");
}

export function normalizePaletteId(value: unknown): PaletteId {
  if (
    value === "teal" ||
    value === "ocean" ||
    value === "forest" ||
    value === "graphite"
  ) {
    return value;
  }
  throw new Error("Choose a supported palette");
}

export function normalizePalettePreference(value: unknown): PaletteId {
  try {
    return normalizePaletteId(value);
  } catch {
    return "teal";
  }
}

export function normalizeSoundEnabled(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function normalizeLearnAutoContinue(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}
