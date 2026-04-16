/**
 * Agent Sign-up Page
 *
 * Paired visually with /login — same centered layout, same brand mark, same
 * footer — so the two screens feel like two tabs of one flow rather than
 * unrelated pages. The only differences are the form itself and the cross-link
 * back to sign-in (handled inside RegisterForm).
 */

import { RegisterForm } from "@/components/auth/RegisterForm"
import { Headset } from "lucide-react"

export default function RegisterPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand mark + product name above the form — matches /login. */}
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

        <RegisterForm />

        <p className="text-center text-xs text-muted-foreground">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </main>
  )
}
