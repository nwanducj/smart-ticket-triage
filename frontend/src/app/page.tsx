/**
 * Landing Page — simulated "lost page" experience
 *
 * The home page is intentionally styled to feel like a friendly 404 /
 * something-went-wrong screen. The goal is to nudge visitors who land here
 * into contacting support via the floating widget (bottom-right), while
 * still giving support agents a discreet path to the login page.
 *
 * The ticket widget is mounted here — and ONLY here — so it doesn't bleed
 * into the agent dashboard, login page, or any internal routes.
 */

import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"
import { TicketWidget } from "@/components/tickets/TicketWidget"

export default function HomePage() {
  return (
    <>
      <main className="flex-1 flex items-center justify-center px-6 py-16 bg-gradient-to-b from-background to-muted/40">
        <div className="w-full max-w-xl text-center space-y-8">
          {/* Oversized "404" — the focal point of the error screen. */}
          <div className="space-y-2">
            <p
              aria-hidden="true"
              className="text-[8rem] leading-none font-bold tracking-tight text-primary/10 select-none"
            >
              404
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Hmm, we can&apos;t find that page.
            </h1>
            <p className="text-lg text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or may have
              been moved. If you think this is a mistake, our team is ready
              to help.
            </p>
          </div>

          {/* Primary CTA — direct the user to the floating widget. */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4 text-left">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold">
                  Need help? Talk to support.
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click the chat button in the{" "}
                  <span className="font-medium text-foreground">
                    bottom-right corner
                  </span>{" "}
                  to submit a ticket. Our AI will route it to the right team
                  and we&apos;ll follow up by email.
                </p>
              </div>
            </div>
          </div>

          {/* Quiet agent-login link — unobtrusive, but easy to find. */}
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Are you a customer support agent?{" "}
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline"
              >
                Log in here
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </p>
          </div>
        </div>
      </main>

      {/* Floating support widget — scoped to the home page only. */}
      <TicketWidget />
    </>
  )
}
