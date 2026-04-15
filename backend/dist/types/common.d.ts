/**
 * Common Shared Types
 *
 * Generic type wrappers used across all API responses. Centralizing these
 * ensures every endpoint returns a consistent JSON shape, which simplifies
 * frontend parsing — the client always knows to check `success` first,
 * then read `data` or `error` accordingly.
 */
import { PaginationResult } from '../utils/pagination';
/**
 * Standard success response shape for single-resource endpoints.
 *
 * Every successful API response wraps its payload in `data` and sets
 * `success: true`. This convention lets the frontend use a single
 * type guard (`if (res.success)`) for all endpoints.
 */
export interface ApiResponse<T> {
    success: true;
    data: T;
}
/**
 * Standard success response for paginated list endpoints.
 *
 * Extends ApiResponse by adding pagination metadata alongside the data array.
 * The frontend reads `pagination.totalPages` to render page controls and
 * `pagination.total` to display "showing X of Y results".
 */
export interface PaginatedResponse<T> {
    success: true;
    data: T[];
    pagination: PaginationResult;
}
/**
 * Standard error response shape.
 *
 * All error responses (4xx, 5xx) use this shape so the frontend can display
 * `error.message` to the user and optionally switch on `error.code` for
 * programmatic handling (e.g., redirect to login on "UNAUTHORIZED").
 */
export interface ApiErrorResponse {
    success: false;
    error: {
        /** Human-readable error message safe to display to the user. */
        message: string;
        /** Machine-readable error code (e.g., "NOT_FOUND", "VALIDATION_ERROR"). */
        code: string;
    };
}
