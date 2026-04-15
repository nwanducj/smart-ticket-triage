/**
 * TicketRow
 *
 * A single row in the ticket table. Displays ticket details with badges
 * and an inline status dropdown for quick updates. The status dropdown
 * triggers an optimistic update via useUpdateTicket.
 *
 * Also shows the name of the agent who last touched the ticket and a
 * history button that opens the full audit log.
 */

"use client"

import { useState } from "react"
import { TableCell, TableRow } from "@/components/ui/table"
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
import { truncate, formatRelativeTime, formatStatus } from "@/lib/utils"
import { TICKET_STATUSES } from "@/types"
import type { Ticket, TicketStatus } from "@/types"
import { HistoryIcon } from "lucide-react"

interface TicketRowProps {
  ticket: Ticket
}

export function TicketRow({ ticket }: TicketRowProps) {
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
      <TableRow>
        {/* Title — truncated with full text available via title attribute */}
        <TableCell className="font-medium max-w-[300px]">
          <span title={ticket.title}>{truncate(ticket.title, 60)}</span>
          {ticket.aiClassificationFailed && (
            <span
              className="ml-2 text-amber-500 text-xs"
              title="AI classification was unavailable — this ticket was classified using keyword matching and may need manual review."
            >
              (AI fallback)
            </span>
          )}
        </TableCell>

        <TableCell>
          <TicketCategoryBadge category={ticket.category} />
        </TableCell>

        <TableCell>
          <TicketPriorityBadge priority={ticket.priority} />
        </TableCell>

        {/* Status — inline dropdown for quick updates (optimistic UI) */}
        <TableCell>
          <Select value={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
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
        </TableCell>

        <TableCell className="text-sm text-muted-foreground">
          {ticket.customerEmail}
        </TableCell>

        {/* Agent who last updated this ticket. Email shows on hover so the
            column stays compact, and we dash out unassigned tickets rather
            than hiding the cell (keeps column alignment consistent). */}
        <TableCell className="text-sm">
          {ticket.lastUpdatedBy ? (
            <span
              title={`${ticket.lastUpdatedBy.email} · ${formatRelativeTime(
                ticket.lastUpdatedBy.at
              )}`}
            >
              {ticket.lastUpdatedBy.name}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>

        <TableCell className="text-sm text-muted-foreground">
          {formatRelativeTime(ticket.createdAt)}
        </TableCell>

        {/* History trigger */}
        <TableCell>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHistoryOpen(true)}
            title="View history"
          >
            <HistoryIcon className="h-4 w-4" />
            <span className="sr-only">View history</span>
          </Button>
        </TableCell>
      </TableRow>

      <TicketHistoryDialog
        ticketId={ticket.id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
    </>
  )
}
