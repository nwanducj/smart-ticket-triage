/**
 * TicketHistoryDialog
 *
 * Opens the audit log for a single ticket. Events come from the
 * `/tickets/:id/history` endpoint via `useTicketHistory`, which is lazy:
 * the query only fires when the dialog is opened (id becomes non-null),
 * so we don't waste requests on every row render.
 *
 * Event types rendered:
 *   • status_change — agent → shows "From → To" transition + actor name
 *   • classified    — LLM/fallback classification outcome (system event)
 *   • created       — initial ticket submission (system event)
 *
 * Actor fields are snapshots captured at write time, so they stay
 * accurate even if the agent's name later changes or they leave.
 */

"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTicketHistory } from "@/hooks/useTicketHistory"
import { formatStatus } from "@/lib/utils"
import type { TicketHistoryEvent, TicketStatus } from "@/types"
import { ArrowRightIcon, SparklesIcon, UserIcon, PlusIcon } from "lucide-react"

interface TicketHistoryDialogProps {
  ticketId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TicketHistoryDialog({
  ticketId,
  open,
  onOpenChange,
}: TicketHistoryDialogProps) {
  // Only fetch when the dialog is actually open — avoids prefetching the
  // history for every ticket on the page.
  const { data, isLoading, isError } = useTicketHistory(open ? ticketId : null)
  const events = data?.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket history</DialogTitle>
          <DialogDescription>
            Every status change and classification event, in chronological order.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto -mx-1 px-1">
          {isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading history…
            </p>
          )}
          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load history.
            </p>
          )}
          {!isLoading && !isError && events.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No events recorded yet.
            </p>
          )}

          {events.length > 0 && (
            <ol className="relative space-y-4 border-l pl-5">
              {events.map((event, i) => (
                <HistoryEventItem key={i} event={event} />
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Event item
// ---------------------------------------------------------------------------

function HistoryEventItem({ event }: { event: TicketHistoryEvent }) {
  const Icon =
    event.type === "status_change"
      ? UserIcon
      : event.type === "classified"
        ? SparklesIcon
        : PlusIcon

  return (
    <li className="relative">
      {/* Timeline dot */}
      <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border bg-background">
        <Icon className="h-2.5 w-2.5 text-muted-foreground" />
      </span>

      <div className="flex flex-col gap-1">
        <div className="text-sm">
          <EventSummary event={event} />
        </div>

        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(event.at)}</span>
          <span>•</span>
          <span title={event.agentEmail ?? undefined}>
            {event.agentName ?? "System"}
          </span>
        </div>

        {event.note && (
          <p className="text-xs text-muted-foreground italic">{event.note}</p>
        )}
      </div>
    </li>
  )
}

function EventSummary({ event }: { event: TicketHistoryEvent }) {
  if (event.type === "status_change") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground">Status</span>
        <StatusPill status={event.fromStatus} />
        <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
        <StatusPill status={event.toStatus} />
      </span>
    )
  }
  if (event.type === "classified") {
    return <span>AI classification completed</span>
  }
  return <span>Ticket created</span>
}

function StatusPill({ status }: { status: TicketStatus | null }) {
  if (!status) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <span className="inline-flex items-center rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">
      {formatStatus(status)}
    </span>
  )
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
