import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function BoardFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "aspect-square w-full overflow-hidden rounded-xl bg-muted shadow-[0_0_0_1px_color-mix(in_oklch,var(--foreground)_12%,transparent),0_18px_50px_-24px_color-mix(in_oklch,var(--foreground)_35%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
