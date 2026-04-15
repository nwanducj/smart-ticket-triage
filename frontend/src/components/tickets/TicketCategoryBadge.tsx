/**
 * TicketCategoryBadge
 *
 * Badge displaying the ticket's category with subtle color coding.
 * "Uncategorized" is shown when category is null (awaiting classification).
 */

import { Badge } from "@/components/ui/badge"
import { formatCategory } from "@/lib/utils"
import type { TicketCategory } from "@/types"

const CATEGORY_STYLES: Record<string, string> = {
  bug: "bg-red-50 text-red-700 hover:bg-red-50",
  feature_request: "bg-indigo-50 text-indigo-700 hover:bg-indigo-50",
  billing: "bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
  account: "bg-amber-50 text-amber-700 hover:bg-amber-50",
  technical_support: "bg-sky-50 text-sky-700 hover:bg-sky-50",
  general: "bg-slate-50 text-slate-700 hover:bg-slate-50",
  uncategorized: "bg-gray-50 text-gray-500 hover:bg-gray-50",
}

export function TicketCategoryBadge({
  category,
}: {
  category: TicketCategory | null
}) {
  const key = category || "uncategorized"
  return (
    <Badge variant="outline" className={CATEGORY_STYLES[key]}>
      {formatCategory(category)}
    </Badge>
  )
}
