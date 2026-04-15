"use strict";
/**
 * Pagination Helper
 * Computes skip/limit values and total-page counts for list endpoints.
 * Centralizing this logic avoids duplicating the same math in every
 * controller and ensures consistent pagination metadata in API responses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPagination = buildPagination;
// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
/**
 * Sane defaults for page and limit when the client omits them.
 *
 * Why these values?
 * - page=1: first page is the natural starting point.
 * - limit=20: shows enough items to be useful without overwhelming the UI
 *   or producing massive JSON payloads. 20 is also a common default in
 *   popular APIs (GitHub, Stripe).
 * - MAX_LIMIT=100: prevents clients from requesting huge pages that would
 *   strain the database and blow up response sizes. Any limit above 100
 *   is silently capped.
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
/**
 * Compute pagination metadata from raw query parameters and a total count.
 *
 * @param page  - Requested page number (1-based). Values < 1 are clamped to 1.
 * @param limit - Requested items per page. Clamped to [1, MAX_LIMIT].
 * @param total - Total matching documents, obtained via Model.countDocuments().
 *
 * @returns A PaginationResult with all fields computed and ready to use.
 *
 * Usage in a controller:
 * ```ts
 * const pagination = buildPagination(req.query.page, req.query.limit, totalCount);
 * const tickets = await Ticket.find(filter)
 *   .skip(pagination.skip)
 *   .limit(pagination.limit);
 * res.json({ success: true, data: tickets, pagination });
 * ```
 */
function buildPagination(page, limit, total = 0) {
    // Parse inputs to integers. Query params arrive as strings, so we coerce.
    // If parsing fails (NaN), we fall back to defaults. This makes the function
    // safe to call directly with req.query values without pre-validation.
    let parsedPage = typeof page === 'string' ? parseInt(page, 10) : (page ?? DEFAULT_PAGE);
    let parsedLimit = typeof limit === 'string' ? parseInt(limit, 10) : (limit ?? DEFAULT_LIMIT);
    // Guard against NaN from malformed query strings like "?page=abc".
    if (Number.isNaN(parsedPage))
        parsedPage = DEFAULT_PAGE;
    if (Number.isNaN(parsedLimit))
        parsedLimit = DEFAULT_LIMIT;
    // Clamp to valid ranges. Negative pages or zero-item pages make no sense
    // and would produce incorrect skip values or empty responses.
    parsedPage = Math.max(1, parsedPage);
    parsedLimit = Math.max(1, Math.min(parsedLimit, MAX_LIMIT));
    // Calculate total pages. Math.ceil ensures a partial last page still counts.
    // When total is 0 (no results), we report 0 pages — the client can show
    // an "empty state" UI.
    const totalPages = total > 0 ? Math.ceil(total / parsedLimit) : 0;
    // Skip = (page - 1) * limit. Page 1 skips 0 documents, page 2 skips `limit`, etc.
    const skip = (parsedPage - 1) * parsedLimit;
    return {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        skip,
    };
}
//# sourceMappingURL=pagination.js.map