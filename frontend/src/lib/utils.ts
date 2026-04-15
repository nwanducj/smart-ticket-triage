/**
 * General Utilities
 *
 * Shared helper functions used throughout the frontend application.
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

/**
 * Merge Tailwind CSS classes with conflict resolution.
 * Combines clsx (conditional classes) with tailwind-merge (deduplication).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an ISO date string to relative time (e.g., "2 hours ago").
 * Used in the ticket table for the "Created At" column.
 */
export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true })
}

/**
 * Truncate a string to a maximum length with ellipsis.
 * Used for ticket titles in the table view.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + "…"
}

/**
 * Format a category value for display (e.g., "feature_request" → "Feature Request").
 */
export function formatCategory(category: string | null): string {
  if (!category) return "Uncategorized"
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Format a status value for display (e.g., "in_progress" → "In Progress").
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Format a priority value for display (e.g., "high" → "High").
 */
export function formatPriority(priority: string | null): string {
  if (!priority) return "Pending"
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}
