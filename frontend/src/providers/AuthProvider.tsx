/**
 * Auth Context Provider
 *
 * Manages authentication state across the application using React context.
 * Provides login, logout, and current agent information to any component
 * via the useAuth() hook.
 *
 * State is initialized from localStorage on mount (if a token exists)
 * and kept in sync — localStorage for persistence across page reloads,
 * React state for in-component reactivity.
 */

"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import { apiClient } from "@/lib/api"
import { setToken, getToken, removeToken, isAuthenticated } from "@/lib/auth"
import type { Agent, ApiResponse, AuthResponse } from "@/types"

// ---------------------------------------------------------------------------
// Context Type
// ---------------------------------------------------------------------------

interface AuthContextType {
  /** The currently logged-in agent, or null if not authenticated. */
  agent: Agent | null
  /** True while checking localStorage for an existing session on mount. */
  loading: boolean
  /** Log in with email and password. Stores JWT and agent info. */
  login: (email: string, password: string) => Promise<void>
  /**
   * Register a new agent and automatically log them in.
   * The backend returns the same {agent, token} shape as /auth/login,
   * so post-register the user is immediately signed in — no second round-trip.
   */
  register: (name: string, email: string, password: string) => Promise<void>
  /** Clear authentication state and redirect to login. */
  logout: () => void
  /** True if an agent is currently logged in. */
  isLoggedIn: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  // On mount, check if we have a valid token in localStorage.
  // If so, decode it to restore the agent session without a login API call.
  useEffect(() => {
    if (isAuthenticated()) {
      const token = getToken()
      if (token) {
        try {
          // Decode the JWT payload to extract agent info.
          const payload = JSON.parse(atob(token.split(".")[1]!))
          setAgent({
            id: payload.id,
            email: payload.email,
            name: payload.email, // JWT doesn't contain name — use email as fallback.
            role: payload.role,
            createdAt: "",
            updatedAt: "",
          })
        } catch {
          // Malformed token — clear it.
          removeToken()
        }
      }
    }
    setLoading(false)
  }, [])

  /**
   * Log in with email and password.
   * Calls the backend auth endpoint, stores the JWT, and sets the agent state.
   */
  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient<ApiResponse<AuthResponse>>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    )

    setToken(response.data.token)
    setAgent(response.data.agent)
  }, [])

  /**
   * Register a new agent account and sign them in.
   *
   * The backend's /auth/register returns the same shape as /auth/login
   * ({agent, token}), so we can share the post-auth plumbing with login.
   * No second API call is needed to establish the session.
   */
  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const response = await apiClient<ApiResponse<AuthResponse>>(
        "/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ name, email, password }),
        }
      )

      setToken(response.data.token)
      setAgent(response.data.agent)
    },
    []
  )

  /**
   * Log out — clear token and agent state.
   */
  const logout = useCallback(() => {
    removeToken()
    setAgent(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        agent,
        loading,
        login,
        register,
        logout,
        isLoggedIn: !!agent,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the auth context from any component.
 *
 * @throws Error if used outside of AuthProvider (programming error).
 *
 * Usage:
 *   const { agent, login, logout, isLoggedIn } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
