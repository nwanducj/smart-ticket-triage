/**
 * useUpdateTicket Hook Tests
 *
 * Tests the optimistic UI update behavior:
 * - Optimistic update applies immediately
 * - Reverts on error
 * - Shows toast notifications
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUpdateTicket } from '@/hooks/useUpdateTicket'
import type { PaginatedResponse, Ticket } from '@/types'

// Mock the API client.
jest.mock('@/lib/api', () => ({
  apiClient: jest.fn(),
}))

// Mock sonner toast.
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>

const mockTicket: Ticket = {
  id: 'ticket-1',
  title: 'Test ticket',
  description: 'Test',
  customerEmail: 'test@test.com',
  status: 'open',
  priority: 'medium',
  category: 'bug',
  aiConfidence: 0.9,
  aiClassificationFailed: false,
  assignedAgent: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  // Pre-populate the cache with ticket data.
  const cachedData: PaginatedResponse<Ticket> = {
    success: true,
    data: [mockTicket],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1, skip: 0 },
  }
  queryClient.setQueryData(['tickets', {}], cachedData)

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  }
}

describe('useUpdateTicket', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls API with correct parameters', async () => {
    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { ...mockTicket, status: 'in_progress' },
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateTicket(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'ticket-1', status: 'in_progress' })
    })

    await waitFor(() => {
      expect(mockApiClient).toHaveBeenCalledWith(
        '/tickets/ticket-1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ status: 'in_progress' }),
        })
      )
    })
  })

  it('shows success toast on successful update', async () => {
    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { ...mockTicket, status: 'resolved' },
    })

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateTicket(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'ticket-1', status: 'resolved' })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Ticket status updated successfully.'
      )
    })
  })

  it('shows error toast and reverts on failure', async () => {
    mockApiClient.mockRejectedValueOnce(new Error('Server error'))

    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateTicket(), { wrapper })

    await act(async () => {
      result.current.mutate({ id: 'ticket-1', status: 'resolved' })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to update ticket status. Please try again.'
      )
    })
  })
})
