/**
 * useUpdateTicket Hook
 *
 * React Query mutation hook for updating a ticket's status with
 * OPTIMISTIC UI updates. When an agent changes a ticket's status:
 *
 * 1. The UI updates immediately (optimistic update) — no waiting for server.
 * 2. The PATCH request is sent in the background.
 * 3. If the request succeeds, the cache is already correct — nothing to do.
 * 4. If the request fails, the UI reverts to the previous state and shows
 *    an error toast.
 *
 * This pattern makes the dashboard feel instant and responsive, which is
 * critical for agents who update dozens of tickets per session.
 */

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import type { ApiResponse, Ticket, PaginatedResponse, TicketStatus } from "@/types"

interface UpdateTicketParams {
  id: string
  status: TicketStatus
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    /**
     * The mutation function — sends the PATCH request to update status.
     */
    mutationFn: async ({ id, status }: UpdateTicketParams) => {
      return apiClient<ApiResponse<Ticket>>(`/tickets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
    },

    /**
     * Optimistic update — runs BEFORE the mutation function.
     *
     * We manually update the React Query cache with the new status so the
     * UI reflects the change immediately. We also save the previous cache
     * state so we can roll back if the mutation fails.
     */
    onMutate: async ({ id, status }) => {
      // Cancel any in-flight refetches for tickets so they don't overwrite
      // our optimistic update with stale data from the server.
      await queryClient.cancelQueries({ queryKey: ["tickets"] })

      // Snapshot the previous cache state for rollback.
      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Ticket>>({
        queryKey: ["tickets"],
      })

      // Optimistically update all cached ticket queries.
      // We iterate over all query keys that start with "tickets" because
      // the user might have multiple filtered views cached simultaneously.
      queryClient.setQueriesData<PaginatedResponse<Ticket>>(
        { queryKey: ["tickets"] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: old.data.map((ticket) =>
              ticket.id === id ? { ...ticket, status } : ticket
            ),
          }
        }
      )

      // Return the snapshot as context for onError rollback.
      return { previousQueries }
    },

    /**
     * Rollback on error — restores the cache to the pre-mutation state.
     *
     * This is the "undo" for the optimistic update. The user sees the
     * status revert to what it was before, and an error toast explains
     * what happened.
     */
    onError: (_error, _variables, context) => {
      // Restore each cached query to its previous state.
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data)
        }
      }

      toast.error("Failed to update ticket status. Please try again.")
    },

    /**
     * On success — the server confirmed the update.
     * Show a success toast so the agent has confirmation.
     */
    onSuccess: () => {
      toast.success("Ticket status updated successfully.")
    },

    /**
     * Always run after the mutation (success or error).
     * Invalidate the tickets query to trigger a background refetch,
     * ensuring the cache is fully in sync with the server.
     */
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })
}
