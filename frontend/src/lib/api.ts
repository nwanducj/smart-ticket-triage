/**
 * API Client
 *
 * Centralized HTTP client for communicating with the backend API.
 * Uses the native fetch API with a thin wrapper that handles:
 * - Base URL configuration
 * - JWT token injection via Authorization header
 * - Consistent error handling and response parsing
 *
 * Why fetch instead of axios?
 * fetch is built into all modern browsers and Node.js 18+, requires no
 * dependency, and is sufficient for our needs. Axios adds ~13KB gzipped
 * for features (interceptors, cancel tokens) we don't need here.
 */

import { getToken } from "./auth"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Base URL for all API requests.
 * Read from the NEXT_PUBLIC_API_URL environment variable.
 * Defaults to localhost:4000/api for local development.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Make an authenticated API request.
 *
 * Automatically injects the JWT token from storage and parses JSON responses.
 * Throws an error with the server's error message on non-2xx responses.
 *
 * @param endpoint - The API path (e.g., "/tickets") — appended to the base URL.
 * @param options - Standard fetch options (method, body, headers, etc.).
 * @returns The parsed JSON response body.
 * @throws Error with the server's error message on failure.
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  // Inject the JWT token if available.
  // Public endpoints (ticket submission) work without a token;
  // protected endpoints (dashboard) require one.
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // Parse the response body. All our API endpoints return JSON.
  const data = await response.json()

  // Check for HTTP errors. The backend always returns { success: false, error: {...} }
  // on failure, so we extract the error message for a helpful thrown error.
  if (!response.ok) {
    const errorMessage =
      data?.error?.message || `Request failed with status ${response.status}`
    throw new Error(errorMessage)
  }

  return data as T
}
