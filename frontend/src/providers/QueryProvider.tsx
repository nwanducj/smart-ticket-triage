/**
 * TanStack Query Provider
 *
 * Wraps the application in React Query's QueryClientProvider, enabling
 * server state management (caching, background refetching, mutations)
 * across all components.
 *
 * Must be a client component ("use client") because React Query uses
 * React context and hooks internally. Server components can't use context.
 */

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

/**
 * QueryProvider wraps children with TanStack Query's context.
 *
 * We create the QueryClient inside useState to ensure each browser tab
 * gets its own client instance (avoiding shared state across tabs in
 * SSR/hydration scenarios).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 30 seconds — data is considered fresh for this
            // duration and won't trigger a background refetch. For a support
            // dashboard, 30s is a good balance between freshness and API load.
            staleTime: 30 * 1000,

            // Retry failed queries once before showing an error.
            // More than 1 retry adds latency without much benefit for
            // a dashboard that the user can manually refresh.
            retry: 1,

            // Refetch when the browser tab regains focus.
            // Agents switching between tabs get fresh ticket data automatically.
            refetchOnWindowFocus: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
