"use client"

import { Suspense } from "react"
import { ThemeProvider } from "next-themes"

import { AuthEventToaster } from "@/components/auth/AuthEventToaster"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        {children}
        <Suspense>
          <AuthEventToaster />
        </Suspense>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
