/**
 * Agent Dashboard Page
 *
 * The primary view for support agents. Displays a filterable, paginated
 * table of all tickets with inline status updates. Uses React Query for
 * data fetching and caching.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { TicketTable } from "@/components/tickets/TicketTable"
import { TicketFilters } from "@/components/tickets/TicketFilters"
import { TicketOverview } from "@/components/tickets/TicketOverview"
import { useTickets } from "@/hooks/useTickets"
import type { TicketStatus, TicketPriority, TicketFilters as Filters } from "@/types"

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 20,
    sort: "createdAt",
    order: "desc",
  })

  const { data, isLoading, isError, error } = useTickets(filters)

  const tickets = data?.data || []
  const pagination = data?.pagination

  const handleStatusChange = (status: TicketStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status, page: 1 }))
  }

  const handlePriorityChange = (priority: TicketPriority | undefined) => {
    setFilters((prev) => ({ ...prev, priority, page: 1 }))
  }

  const handleClearFilters = () => {
    setFilters({ page: 1, limit: 20, sort: "createdAt", order: "desc" })
  }

  const handlePreviousPage = () => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(1, (prev.page || 1) - 1),
    }))
  }

  const handleNextPage = () => {
    if (pagination && (filters.page || 1) < pagination.totalPages) {
      setFilters((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
        <p className="text-muted-foreground">
          Manage and triage customer support tickets.
        </p>
      </div>

      {/* At-a-glance status & priority counts. */}
      <TicketOverview />

      {/* Filters */}
      <TicketFilters
        status={filters.status}
        priority={filters.priority}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onClear={handleClearFilters}
      />

      {/* Error State */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <p className="font-medium">Failed to load tickets</p>
          <p className="text-sm mt-1">
            {error instanceof Error ? error.message : "An unexpected error occurred."}
          </p>
        </div>
      )}

      {/* Ticket Table */}
      <TicketTable tickets={tickets} isLoading={isLoading} />

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
            total tickets)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
