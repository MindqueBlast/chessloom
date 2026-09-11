import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/components/providers/AppProviders";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://chessloom.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Chessloom — Opening repertoire trainer",
    template: "%s | Chessloom",
  },
  description:
    "Free open-source chess opening trainer. Pick a beginner Lichess study or import your repertoire, then Learn, Practice, and review with FSRS.",
  openGraph: {
    title: "Chessloom — Opening repertoire trainer",
    description:
      "Quiz your openings — curated starters for beginners, or import your own Lichess/PGN repertoire.",
    url: siteUrl,
    siteName: "Chessloom",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chessloom — Opening repertoire trainer",
    description:
      "Free OSS opening trainer with Learn, Practice, Test, and spaced review.",
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
