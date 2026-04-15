/**
 * useTickets Hook
 *
 * React Query hook for fetching tickets with filters and pagination.
 * Manages caching, background refetching, and loading/error states.
 */

"use client"

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { PaginatedResponse, Ticket, TicketFilters } from "@/types"

/**
 * Fetch tickets from the API with filters and pagination.
 *
 * @param filters - Optional filters (status, priority, page, limit, sort, order).
 * @returns React Query result with tickets, pagination, loading, and error states.
 *
 * The query key includes all filter parameters so React Query automatically
 * refetches when any filter changes — no manual cache invalidation needed.
 */
export function useTickets(filters: TicketFilters = {}) {
  return useQuery({
    // Query key includes filters so changing a filter triggers a refetch.
    // React Query treats different keys as different cached queries.
    queryKey: ["tickets", filters],

    queryFn: async () => {
      // Build query string from non-undefined filter values.
      const params = new URLSearchParams()
      if (filters.page) params.set("page", String(filters.page))
      if (filters.limit) params.set("limit", String(filters.limit))
      if (filters.status) params.set("status", filters.status)
      if (filters.priority) params.set("priority", filters.priority)
      if (filters.sort) params.set("sort", filters.sort)
      if (filters.order) params.set("order", filters.order)

      const queryString = params.toString()
      const endpoint = `/tickets${queryString ? `?${queryString}` : ""}`

      return apiClient<PaginatedResponse<Ticket>>(endpoint)
    },

    // Keep previous data visible while fetching new page/filter results.
    // This prevents the UI from flashing empty → loading → data on filter changes.
    placeholderData: (previousData) => previousData,
  })
}
