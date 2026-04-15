/**
 * AuthGuard
 *
 * Client component that protects routes requiring authentication.
 * If the user is not logged in, redirects to /login.
 * Shows a loading state while checking auth status on mount.
 */

"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push("/login")
    }
  }, [loading, isLoggedIn, router])

  // Show loading state while checking auth.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Don't render children if not authenticated (redirect is happening).
  if (!isLoggedIn) {
    return null
  }

  return <>{children}</>
}
