/**
 * useCreateTicket Hook
 *
 * React Query mutation hook for submitting a new support ticket.
 * Used on the public /submit page. On success, invalidates the tickets
 * cache so the dashboard shows the new ticket immediately.
 */

"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api"
import type { ApiResponse, Ticket } from "@/types"

interface CreateTicketInput {
  title: string
  description: string
  customerEmail: string
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTicketInput) => {
      return apiClient<ApiResponse<Ticket>>("/tickets", {
        method: "POST",
        body: JSON.stringify(input),
      })
    },

    onSuccess: () => {
      // Invalidate the tickets cache so the dashboard shows the new ticket
      // if an agent is viewing it simultaneously.
      queryClient.invalidateQueries({ queryKey: ["tickets"] })
    },
  })
}
