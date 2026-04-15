/**
 * TicketFilters
 *
 * Filter controls bar at the top of the dashboard. Provides dropdown
 * filters for status and priority, plus a "Clear Filters" button.
 * Filter state is managed by the parent (dashboard page) and passed
 * down to this component.
 */

"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TICKET_STATUSES, TICKET_PRIORITIES } from "@/types"
import { formatStatus, formatPriority } from "@/lib/utils"
import type { TicketStatus, TicketPriority } from "@/types"

interface TicketFiltersProps {
  status: TicketStatus | undefined
  priority: TicketPriority | undefined
  onStatusChange: (status: TicketStatus | undefined) => void
  onPriorityChange: (priority: TicketPriority | undefined) => void
  onClear: () => void
}

export function TicketFilters({
  status,
  priority,
  onStatusChange,
  onPriorityChange,
  onClear,
}: TicketFiltersProps) {
  const hasFilters = status !== undefined || priority !== undefined

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:flex-wrap">
      {/* Status Filter */}
      <Select
        value={status || "all"}
        onValueChange={(value) =>
          onStatusChange(value === "all" ? undefined : (value as TicketStatus))
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          {/* base-ui's Select.Value renders the raw value by default, so we
              pass a render function to map the value back to its label. */}
          <SelectValue placeholder="Filter by Status">
            {(value) =>
              !value || value === "all"
                ? "All Statuses"
                : formatStatus(value as TicketStatus)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TICKET_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {formatStatus(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select
        value={priority || "all"}
        onValueChange={(value) =>
          onPriorityChange(
            value === "all" ? undefined : (value as TicketPriority)
          )
        }
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="Filter by Priority">
            {(value) =>
              !value || value === "all"
                ? "All Priorities"
                : formatPriority(value as TicketPriority)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {TICKET_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {formatPriority(p)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
