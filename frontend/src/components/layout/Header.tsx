/**
 * Header
 *
 * Dashboard header bar with the app title, agent info, and logout button.
 * Displayed at the top of the protected dashboard layout.
 */

"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

export function Header() {
  const { agent, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">
            Smart Triage
          </h1>
          <span className="text-sm text-muted-foreground hidden md:inline">
            Support Dashboard
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {agent && (
            <span className="text-sm text-muted-foreground hidden md:inline truncate max-w-[240px]">
              {agent.email}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
