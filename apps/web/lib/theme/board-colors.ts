"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { usePalette } from "@/components/providers/PaletteProvider";

export function useBoardSquareColors() {
  const { resolvedTheme } = useTheme();
  const { palette } = usePalette();
  const [colors, setColors] = useState({
    dark: "#4f8583",
    light: "#dce9e2",
  });

  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setColors({
      dark:
        styles.getPropertyValue("--board-square-dark").trim() || "#4f8583",
      light:
        styles.getPropertyValue("--board-square-light").trim() || "#dce9e2",
    });
  }, [resolvedTheme, palette]);

  return colors;
}
