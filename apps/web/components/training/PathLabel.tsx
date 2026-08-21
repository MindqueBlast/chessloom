"use client";

import { formatPathLabel, formatPathSan } from "@chessloom/chess-core";

export function PathLabel({
  pathKey,
  chapterTitle,
  className,
}: {
  pathKey: string;
  chapterTitle?: string | null;
  className?: string;
}) {
  const label = formatPathLabel(pathKey, { chapterTitle });
  return (
    <span className={className} title={pathKey}>
      {label}
    </span>
  );
}

export function pathSan(pathKey: string): string {
  return formatPathSan(pathKey);
}
