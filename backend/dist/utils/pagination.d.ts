/**
 * Pagination Helper
 * Computes skip/limit values and total-page counts for list endpoints.
 * Centralizing this logic avoids duplicating the same math in every
 * controller and ensures consistent pagination metadata in API responses.
 */
/**
 * The computed pagination metadata returned to the caller.
 *
 * Controllers pass this into the API response wrapper so every paginated
 * endpoint returns identical metadata keys. Frontend clients depend on
 * this shape to render page controls ("Page 2 of 14").
 */
export interface PaginationResult {
    /** Current page number (1-based). */
    page: number;
    /** Maximum items per page. */
    limit: number;
    /** Total number of items matching the query (across all pages). */
    total: number;
    /** Total number of pages — derived from Math.ceil(total / limit). */
    totalPages: number;
    /**
     * Number of documents to skip in the database query.
     * This is a computed convenience value so controllers can write:
     *   Model.find(filter).skip(pagination.skip).limit(pagination.limit)
     */
    skip: number;
}
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
export declare function buildPagination(page?: number | string | null, limit?: number | string | null, total?: number): PaginationResult;
