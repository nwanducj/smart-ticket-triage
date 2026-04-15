/**
 * TicketCard
 *
 * Mobile-friendly rendering of a single ticket — used by TicketTable when
 * the viewport is below `md`. Mirrors the information in TicketRow but
 * stacked vertically so nothing is truncated or horizontally scrolled.
 *
 * Behaviour parity with TicketRow:
 *  - Status is editable via the same inline Select (optimistic update).
 *  - AI-fallback badge appears inline next to the title.
 *  - Relative timestamp shown underneath.
 *  - Last-updated-by agent + history button available.
 */

"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { TicketPriorityBadge } from "./TicketPriorityBadge"
import { TicketCategoryBadge } from "./TicketCategoryBadge"
import { TicketHistoryDialog } from "./TicketHistoryDialog"
import { useUpdateTicket } from "@/hooks/useUpdateTicket"
import { formatRelativeTime, formatStatus } from "@/lib/utils"
import { TICKET_STATUSES } from "@/types"
import type { Ticket, TicketStatus } from "@/types"
import { HistoryIcon } from "lucide-react"

interface TicketCardProps {
  ticket: Ticket
}

export function TicketCard({ ticket }: TicketCardProps) {
  const updateTicket = useUpdateTicket()
  const [historyOpen, setHistoryOpen] = useState(false)

  const handleStatusChange = (newStatus: string | null) => {
    if (!newStatus) return
    updateTicket.mutate({
      id: ticket.id,
      status: newStatus as TicketStatus,
    })
  }

  return (
    <>
      <article className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
        {/* Title + AI-fallback flag. `break-words` ensures long unbroken
            strings (URLs, error codes) wrap instead of overflowing. */}
        <div>
          <h3 className="font-medium text-sm leading-snug break-words">
            {ticket.title}
            {ticket.aiClassificationFailed && (
              <span
                className="ml-2 text-amber-500 text-xs font-normal"
                title="AI classification was unavailable — classified via keyword fallback."
              >
                (AI fallback)
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground break-all">
            {ticket.customerEmail}
          </p>
        </div>

        {/* Badges row — wraps onto multiple lines on very narrow devices. */}
        <div className="flex flex-wrap items-center gap-2">
          <TicketCategoryBadge category={ticket.category} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>

        {/* Status editor + created-at. Stacked on the smallest screens,
            side-by-side once there's room. */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-9 text-sm">
              <SelectValue>
                {(value) => (value ? formatStatus(value as TicketStatus) : "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {TICKET_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {formatStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(ticket.createdAt)}
          </span>
        </div>

        {/* Attribution + history — the desktop row tucks the history button
            into its own column, but on mobile we inline it with the actor
            name so the card footer stays a single row. */}
        <div className="flex items-center justify-between border-t pt-3 text-xs">
          <span className="text-muted-foreground">
            {ticket.lastUpdatedBy ? (
              <>
                Updated by{" "}
                <span className="font-medium text-foreground">
                  {ticket.lastUpdatedBy.name}
                </span>
              </>
            ) : (
              "No updates yet"
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="h-7 px-2"
          >
            <HistoryIcon className="h-3.5 w-3.5 mr-1" />
            History
          </Button>
        </div>
      </article>

      <TicketHistoryDialog
        ticketId={ticket.id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  )
}
