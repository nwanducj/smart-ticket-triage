/**
 * Root Layout
 *
 * The top-level layout wrapping the entire application. Sets up:
 * - Global CSS and fonts
 * - QueryProvider for React Query (server state management)
 * - AuthProvider for JWT-based authentication state
 * - Toaster for toast notifications (from sonner/shadcn)
 */

import type { Metadata } from "next"
import { Source_Sans_3 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import "./globals.css"

// Source Sans 3 — Adobe's open-source humanist sans-serif, refreshed in 2022.
// One typeface used system-wide: we bind it to both the sans and mono CSS
// variables so every component (including code-like fragments that use
// `font-mono`) renders with Source Sans 3.
const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Smart Triage — AI-Powered Ticketing System",
  description:
    "Submit and manage support tickets with AI-powered classification and prioritization.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
