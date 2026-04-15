/**
 * TicketTable
 *
 * Primary data view on the agent dashboard. Renders in two layouts:
 *
 *  • `md+`: a 6-column table (Title, Category, Priority, Status, Customer,
 *    Created). Same density/information as before.
 *  • `< md`: a stack of cards, one per ticket, arranged vertically so every
 *    cell fits the viewport width. This is the standard "responsive table"
 *    pattern — trying to shrink a wide table onto a phone always ends up
 *    either overflowing horizontally or truncating everything, and cards
 *    avoid both.
 *
 * Loading and empty states are rendered once (not duplicated per layout)
 * because they don't depend on viewport size.
 */

"use client"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TicketRow } from "./TicketRow"
import { TicketCard } from "./TicketCard"
import type { Ticket } from "@/types"

interface TicketTableProps {
  tickets: Ticket[]
  isLoading: boolean
}

export function TicketTable({ tickets, isLoading }: TicketTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Loading tickets...
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No tickets found. Try adjusting your filters.
      </div>
    )
  }

  return (
    <>
      {/* Mobile: vertical card stack — shown below `md`. */}
      <div className="md:hidden space-y-3">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>

      {/* Desktop: data table — hidden on mobile, visible from `md` up.
          `overflow-x-auto` is a safety net in case the viewport is
          narrower than the table's minimum intrinsic width. */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[1%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
