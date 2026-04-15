/**
 * TicketOverview
 *
 * At-a-glance stat strip shown above the ticket table on the agent
 * dashboard. It surfaces the "perceived state of things":
 *
 *   • Total tickets in the system
 *   • One tile per status (Open, In Progress, Waiting, Resolved, Closed)
 *   • A "Critical" tile highlighting tickets that need immediate attention
 *
 * Implementation note — why `limit=1`:
 * We don't have a dedicated /tickets/stats endpoint on the backend, so we
 * piggy-back on the existing list endpoint. Each tile fires a tiny query
 * with `limit: 1` and reads `pagination.total`. That keeps the payload
 * minimal (one ticket or zero) while still giving us an exact count,
 * without any schema changes. Queries run in parallel via React Query
 * and are cached under their own keys, so they don't clash with the
 * main ticket list query on the page.
 */

"use client"

import {
  Inbox,
  PlayCircle,
  Clock,
  CheckCircle2,
  Archive,
  AlertTriangle,
  Layers,
  type LucideIcon,
} from "lucide-react"
import { useTickets } from "@/hooks/useTickets"
import { cn } from "@/lib/utils"
import type {
  TicketFilters as Filters,
  TicketPriority,
  TicketStatus,
} from "@/types"

// ---------------------------------------------------------------------------
// Tile config — order here drives render order in the UI.
// ---------------------------------------------------------------------------

interface Tile {
  key: string
  label: string
  icon: LucideIcon
  /** Tailwind classes for the icon chip. */
  iconClass: string
  /** React Query filters used to derive this tile's count. */
  filters: Filters
  /** Optional emphasis — bumps the number size / adds a border tint. */
  emphasize?: boolean
}

const TILES: Tile[] = [
  {
    key: "total",
    label: "Total tickets",
    icon: Layers,
    iconClass: "bg-slate-100 text-slate-700",
    filters: { page: 1, limit: 1 },
    emphasize: true,
  },
  {
    key: "open",
    label: "Open",
    icon: Inbox,
    iconClass: "bg-blue-100 text-blue-700",
    filters: {
      page: 1,
      limit: 1,
      status: "open" satisfies TicketStatus,
    },
  },
  {
    key: "in_progress",
    label: "In Progress",
    icon: PlayCircle,
    iconClass: "bg-amber-100 text-amber-700",
    filters: {
      page: 1,
      limit: 1,
      status: "in_progress" satisfies TicketStatus,
    },
  },
  {
    key: "waiting_on_customer",
    label: "Waiting",
    icon: Clock,
    iconClass: "bg-purple-100 text-purple-700",
    filters: {
      page: 1,
      limit: 1,
      status: "waiting_on_customer" satisfies TicketStatus,
    },
  },
  {
    key: "resolved",
    label: "Resolved",
    icon: CheckCircle2,
    iconClass: "bg-green-100 text-green-700",
    filters: {
      page: 1,
      limit: 1,
      status: "resolved" satisfies TicketStatus,
    },
  },
  {
    key: "closed",
    label: "Closed",
    icon: Archive,
    iconClass: "bg-gray-100 text-gray-700",
    filters: {
      page: 1,
      limit: 1,
      status: "closed" satisfies TicketStatus,
    },
  },
  {
    key: "critical",
    label: "Critical priority",
    icon: AlertTriangle,
    iconClass: "bg-red-100 text-red-700",
    filters: {
      page: 1,
      limit: 1,
      priority: "critical" satisfies TicketPriority,
    },
    emphasize: true,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TicketOverview() {
  return (
    <section aria-label="Ticket overview" className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Overview
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {TILES.map((tile) => (
          <StatTile key={tile.key} tile={tile} />
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// StatTile — one card, one count.
// ---------------------------------------------------------------------------

interface StatTileProps {
  tile: Tile
}

function StatTile({ tile }: StatTileProps) {
  // Each tile owns its own query. React Query dedupes identical keys, so if
  // two tiles ever had the same filters they'd share a single request.
  const { data, isLoading, isError } = useTickets(tile.filters)

  const count = data?.pagination?.total ?? 0
  const Icon = tile.icon

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm transition-colors",
        tile.emphasize ? "border-border" : "border-border/70"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {tile.label}
        </span>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            tile.iconClass
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3">
        {isLoading ? (
          // Skeleton — matches the height of the real number so the layout
          // doesn't jump when the query resolves.
          <div
            aria-hidden="true"
            className="h-8 w-12 animate-pulse rounded bg-muted"
          />
        ) : isError ? (
          <span
            className="text-sm text-muted-foreground"
            title="Failed to load count"
          >
            —
          </span>
        ) : (
          <span
            className={cn(
              "font-bold tabular-nums",
              tile.emphasize ? "text-3xl" : "text-2xl"
            )}
          >
            {count.toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}
