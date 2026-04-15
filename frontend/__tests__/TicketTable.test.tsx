/**
 * TicketTable Tests
 *
 * Tests the ticket data table component:
 * - Renders ticket data correctly
 * - Shows correct badge colors/text
 * - Handles empty state
 * - Handles loading state
 */

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TicketTable } from '@/components/tickets/TicketTable'
import type { Ticket } from '@/types'

// Mock sonner toast to avoid import issues in test environment.
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

const mockTickets: Ticket[] = [
  {
    id: '1',
    title: 'Payment failed but I was charged twice',
    description: 'Test description',
    customerEmail: 'customer@test.com',
    status: 'open',
    priority: 'high',
    category: 'billing',
    aiConfidence: 0.95,
    aiClassificationFailed: false,
    assignedAgent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'App crashes on upload',
    description: 'Another test',
    customerEmail: 'user@test.com',
    status: 'in_progress',
    priority: 'medium',
    category: 'bug',
    aiConfidence: 0.88,
    aiClassificationFailed: false,
    assignedAgent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Fallback classified ticket',
    description: 'Test',
    customerEmail: 'test@test.com',
    status: 'open',
    priority: null,
    category: null,
    aiConfidence: null,
    aiClassificationFailed: true,
    assignedAgent: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('TicketTable', () => {
  it('renders ticket data', () => {
    renderWithProviders(
      <TicketTable tickets={mockTickets} isLoading={false} />
    )

    // Check that ticket titles are rendered (truncated to 60 chars).
    expect(screen.getByText(/Payment failed/)).toBeInTheDocument()
    expect(screen.getByText(/App crashes/)).toBeInTheDocument()

    // Check that customer emails are shown.
    expect(screen.getByText('customer@test.com')).toBeInTheDocument()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('shows correct badge text for priorities', () => {
    renderWithProviders(
      <TicketTable tickets={mockTickets} isLoading={false} />
    )

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument() // null priority
  })

  it('shows correct badge text for categories', () => {
    renderWithProviders(
      <TicketTable tickets={mockTickets} isLoading={false} />
    )

    expect(screen.getByText('Billing')).toBeInTheDocument()
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Uncategorized')).toBeInTheDocument() // null category
  })

  it('shows AI fallback indicator', () => {
    renderWithProviders(
      <TicketTable tickets={mockTickets} isLoading={false} />
    )

    expect(screen.getByText('(AI fallback)')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    renderWithProviders(<TicketTable tickets={[]} isLoading={true} />)

    expect(screen.getByText(/loading tickets/i)).toBeInTheDocument()
  })

  it('shows empty state', () => {
    renderWithProviders(<TicketTable tickets={[]} isLoading={false} />)

    expect(screen.getByText(/no tickets found/i)).toBeInTheDocument()
  })
})
