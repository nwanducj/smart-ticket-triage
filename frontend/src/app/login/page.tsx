/**
 * Agent Login Page
 *
 * A dedicated, standalone authentication screen for support agents. No home
 * link, no back navigation — this page exists solely to get an agent signed
 * in. The layout is a centered card on a subtle gradient background, with
 * branding above the card and a small legal/footer line below.
 */

import { LoginForm } from "@/components/auth/LoginForm"
import { Headset } from "lucide-react"

export default function LoginPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand mark + product name above the card. */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Headset className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Smart Triage
            </p>
            <p className="text-sm text-muted-foreground">
              Support Agent Portal
            </p>
          </div>
        </div>

        <LoginForm />

        <p className="text-center text-xs text-muted-foreground">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </main>
  )
}
