/**
 * Auth Utilities
 *
 * Client-side JWT token management. Handles storage, retrieval, and
 * basic token inspection (decode without verification).
 *
 * SECURITY TRADEOFF: We store the JWT in localStorage for simplicity.
 * In production, this is vulnerable to XSS attacks — a malicious script
 * can read localStorage and steal the token. Better alternatives:
 * - HttpOnly cookies (server sets cookie, browser sends it automatically)
 * - In-memory only (lost on page refresh — poor UX)
 * For this demo, localStorage is acceptable. The AuthProvider also keeps
 * the token in React state for in-memory access.
 *
 * TODO(production): Migrate to HttpOnly cookie-based auth to eliminate
 * XSS token theft risk. This requires backend changes (set-cookie header
 * on login, cookie parsing middleware on protected routes).
 */

// ---------------------------------------------------------------------------
// Token Storage
// ---------------------------------------------------------------------------

const TOKEN_KEY = "smart_triage_token"

/**
 * Store the JWT token in localStorage.
 * Called after successful login or registration.
 */
export function setToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token)
  }
}

/**
 * Retrieve the JWT token from localStorage.
 * Returns null if no token exists or if running on the server.
 */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY)
  }
  return null
}

/**
 * Remove the JWT token from localStorage.
 * Called on logout.
 */
export function removeToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY)
  }
}

/**
 * Check if a JWT token exists and is not expired.
 *
 * Note: This only checks the token's exp claim client-side — it does NOT
 * verify the signature. Server-side verification happens on every API call
 * via the auth middleware. This is just a convenience for the UI to know
 * whether to show the login page or the dashboard.
 */
export function isAuthenticated(): boolean {
  const token = getToken()
  if (!token) return false

  try {
    // JWT structure: header.payload.signature
    // We decode the payload (base64) to check expiration.
    const payload = JSON.parse(atob(token.split(".")[1]!))
    const expiresAt = payload.exp * 1000 // JWT exp is in seconds, Date.now() is ms.
    return Date.now() < expiresAt
  } catch {
    // If the token is malformed, treat as unauthenticated.
    return false
  }
}
