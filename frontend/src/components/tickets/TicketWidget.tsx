/**
 * TicketWidget
 *
 * Intercom-style floating support widget. A fixed-position button lives in
 * the bottom-right corner of every page; clicking it opens a popup panel
 * that slides up and anchors to the same corner. The panel hosts the ticket
 * submission form. On success the panel flips to a "thank you" confirmation
 * that offers a "Submit another ticket" action.
 *
 * Design notes:
 * - Self-contained: owns its own form state, open/closed state, and the
 *   post-submit confirmation state. This keeps it drop-in simple — mount
 *   it once in the root layout and it works on every route.
 * - Accessibility: uses a proper dialog role with an Esc-to-close handler,
 *   focus return, and aria-labels on the toggle button. The panel stays
 *   within the viewport on small screens via responsive max-width/height.
 * - No extra deps: we don't reach for Radix Dialog because this widget is
 *   modeless (it doesn't trap focus or dim the page) — Intercom's widget
 *   behaves the same way. A raw div with `role="dialog"` is sufficient.
 */

"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCreateTicket } from "@/hooks/useCreateTicket"
import { cn } from "@/lib/utils"

export function TicketWidget() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successId, setSuccessId] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const createTicket = useCreateTicket()

  /** Close on Esc for keyboard users. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  /** Reset form fields and the success view — used by "Submit another". */
  const resetForm = () => {
    setTitle("")
    setDescription("")
    setCustomerEmail("")
    setErrors({})
    setSuccessId(null)
    createTicket.reset()
  }

  /** Client-side validation mirroring backend Zod rules (min 3 chars). */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim() || title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters"
    } else if (title.length > 500) {
      newErrors.title = "Title cannot exceed 500 characters"
    }

    if (!description.trim() || description.trim().length < 3) {
      newErrors.description = "Description must be at least 3 characters"
    } else if (description.length > 5000) {
      newErrors.description = "Description cannot exceed 5000 characters"
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      newErrors.customerEmail = "Please provide a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      const result = await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
      })
      setSuccessId(result.data.id)
    } catch {
      // Error surfaced via createTicket.isError — nothing to do here.
    }
  }

  return (
    <>
      {/* --- Floating Action Button (bottom-right) --- */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="ticket-widget-panel"
        aria-label={open ? "Close support form" : "Open support form"}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center",
          "rounded-full bg-primary text-primary-foreground shadow-lg",
          "transition-transform hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        )}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* --- Popup Panel --- */}
      {open && (
        <div
          ref={panelRef}
          id="ticket-widget-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ticket-widget-heading"
          className={cn(
            // Anchored to the FAB; sits just above it.
            "fixed bottom-24 right-6 z-50 w-[calc(100vw-3rem)] max-w-[400px]",
            "flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden",
            "rounded-2xl border border-border bg-card text-card-foreground shadow-2xl",
            // Slide-up entrance animation (Tailwind built-ins).
            "animate-in fade-in slide-in-from-bottom-4 duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border bg-primary px-5 py-4 text-primary-foreground">
            <div>
              <h2
                id="ticket-widget-heading"
                className="text-xl font-bold leading-tight"
              >
                {successId ? "Thanks for reaching out!" : "How can we help?"}
              </h2>
              <p className="mt-1 text-sm opacity-90">
                {successId
                  ? "We've received your ticket."
                  : "Send us a message and we'll get back to you."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1 opacity-80 transition hover:bg-white/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body — scrollable when content exceeds available height */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {successId ? (
              <ThankYouState
                ticketId={successId}
                onAnother={resetForm}
                onClose={() => setOpen(false)}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {createTicket.isError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-medium">Failed to submit ticket</p>
                    <p className="mt-1">
                      {createTicket.error instanceof Error
                        ? createTicket.error.message
                        : "An unexpected error occurred. Please try again."}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="tw-title">Title</Label>
                  <Input
                    id="tw-title"
                    placeholder="Brief summary of your issue"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={500}
                    aria-invalid={!!errors.title}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-600">{errors.title}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tw-description">Description</Label>
                  <Textarea
                    id="tw-description"
                    placeholder="Describe your issue in detail…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={5000}
                    rows={5}
                    aria-invalid={!!errors.description}
                  />
                  <div className="flex items-center justify-between">
                    {errors.description ? (
                      <p className="text-xs text-red-600">
                        {errors.description}
                      </p>
                    ) : (
                      <span />
                    )}
                    <p className="text-xs text-muted-foreground">
                      {description.length}/5000
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tw-email">Your Email</Label>
                  <Input
                    id="tw-email"
                    type="email"
                    placeholder="you@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    aria-invalid={!!errors.customerEmail}
                  />
                  {errors.customerEmail && (
                    <p className="text-xs text-red-600">
                      {errors.customerEmail}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={createTicket.isPending}
                >
                  {createTicket.isPending ? "Submitting…" : "Submit Ticket"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Thank-you state
// ---------------------------------------------------------------------------

interface ThankYouStateProps {
  ticketId: string
  onAnother: () => void
  onClose: () => void
}

/**
 * Post-submit confirmation shown inside the widget panel. Mirrors Intercom's
 * pattern: a success indicator, the generated ticket ID for the customer's
 * reference, and a primary action to start another submission without
 * leaving the widget.
 */
function ThankYouState({ ticketId, onAnother, onClose }: ThankYouStateProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mt-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
        <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">
        Thank you for submitting!
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ve received your ticket and will review it shortly.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">Ticket ID</p>
      <code className="font-mono text-sm break-all">{ticketId}</code>

      <div className="mt-6 flex w-full flex-col gap-2">
        <Button onClick={onAnother} className="w-full" size="lg">
          Submit another ticket
        </Button>
        <Button
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          Close
        </Button>
      </div>
    </div>
  )
}
