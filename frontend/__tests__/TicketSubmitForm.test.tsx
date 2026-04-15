/**
 * TicketSubmitForm Tests
 *
 * Tests the customer-facing ticket submission form:
 * - Renders all required fields
 * - Validates empty submission
 * - Calls API on valid submit
 * - Shows success message after submission
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TicketSubmitForm } from '@/components/tickets/TicketSubmitForm'

// Mock the API client module.
jest.mock('@/lib/api', () => ({
  apiClient: jest.fn(),
}))

// Import the mocked function for test-specific behavior.
import { apiClient } from '@/lib/api'
const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>

/** Wrap components in required providers for testing. */
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
}

describe('TicketSubmitForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all form fields', () => {
    renderWithProviders(<TicketSubmitForm />)

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit ticket/i })).toBeInTheDocument()
  })

  it('shows validation errors on empty submission', async () => {
    renderWithProviders(<TicketSubmitForm />)

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument()
      expect(screen.getByText(/description is required/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('calls API and shows success on valid submission', async () => {
    mockApiClient.mockResolvedValueOnce({
      success: true,
      data: { id: 'test-ticket-123', title: 'Test', status: 'open' },
    })

    renderWithProviders(<TicketSubmitForm />)

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Test ticket title' },
    })
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'This is a test description for the ticket.' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    })

    fireEvent.click(screen.getByRole('button', { name: /submit ticket/i }))

    await waitFor(() => {
      expect(screen.getByText(/ticket submitted successfully/i)).toBeInTheDocument()
      expect(screen.getByText(/test-ticket-123/i)).toBeInTheDocument()
    })

    expect(mockApiClient).toHaveBeenCalledWith('/tickets', expect.objectContaining({
      method: 'POST',
    }))
  })

  it('shows character count for description', () => {
    renderWithProviders(<TicketSubmitForm />)

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Hello world' },
    })

    // The character counter should display the current length.
    expect(screen.getByText('11/5000')).toBeInTheDocument()
  })
})
