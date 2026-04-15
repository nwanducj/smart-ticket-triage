/**
 * Dashboard Layout
 *
 * Protected layout for all dashboard pages. Wraps content with:
 * - AuthGuard (redirects to /login if not authenticated)
 * - Header (app title, agent info, logout)
 * - Sidebar (navigation)
 */

import { AuthGuard } from "@/components/auth/AuthGuard"
import { Header } from "@/components/layout/Header"
import { Sidebar } from "@/components/layout/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col flex-1">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          {/* `min-w-0` prevents children (like wide tables) from forcing the
              flex parent to grow beyond the viewport on small screens. */}
          <main className="flex-1 min-w-0 p-4 md:p-6 bg-gray-50/50">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
