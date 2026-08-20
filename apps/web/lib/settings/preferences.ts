export type ThemePreference = "light" | "dark" | "system";
export type DefaultSideMode = "white" | "black" | "both";

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
