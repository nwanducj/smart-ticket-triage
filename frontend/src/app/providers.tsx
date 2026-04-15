/**
 * Client-side Providers Wrapper
 *
 * Combines all client-side context providers into a single component
 * that the root layout can render. This keeps the layout file clean
 * and makes it easy to add/remove providers.
 *
 * Must be "use client" because providers use React context.
 */

"use client"

import { QueryProvider } from "@/providers/QueryProvider"
import { AuthProvider } from "@/providers/AuthProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  )
}
