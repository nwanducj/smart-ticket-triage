/**
 * TicketPriorityBadge
 *
 * Color-coded badge for ticket priority levels.
 * Critical=red, High=orange, Medium=yellow, Low=green.
 * "Pending" is shown when priority is null (awaiting LLM classification).
 */

import { Badge } from "@/components/ui/badge"
import { formatPriority } from "@/lib/utils"
import type { TicketPriority } from "@/types"

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-800 hover:bg-red-100",
  high: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  medium: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  low: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-gray-100 text-gray-500 hover:bg-gray-100",
}

export function TicketPriorityBadge({
  priority,
}: {
  priority: TicketPriority | null
}) {
  const key = priority || "pending"
  return (
    <Badge variant="outline" className={PRIORITY_STYLES[key]}>
      {formatPriority(priority)}
    </Badge>
  )
}
