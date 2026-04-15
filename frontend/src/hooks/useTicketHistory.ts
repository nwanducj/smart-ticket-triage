/**
 * useTicketHistory Hook
 *
 * Fetches the audit log for a single ticket. The query is `enabled` only
 * when `id` is truthy, so we can keep the hook mounted (e.g. inside a
 * dialog component) without firing a request until the user actually
 * opens the history view.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { ApiResponse, TicketHistoryEvent } from "@/types"

export function useTicketHistory(id: string | null) {
  return useQuery({
    queryKey: ["ticket-history", id],
    queryFn: () =>
      apiClient<ApiResponse<TicketHistoryEvent[]>>(`/tickets/${id}/history`),
    enabled: !!id,
  })
}
