"use client";

import { Suspense } from "react";
import { ThemeProvider } from "next-themes";

import { AuthEventToaster } from "@/components/auth/AuthEventToaster";
import { PaletteProvider } from "@/components/providers/PaletteProvider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <PaletteProvider>
        <TooltipProvider>
          {children}
          <Suspense>
            <AuthEventToaster />
          </Suspense>
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </PaletteProvider>
    </ThemeProvider>
  );
}
