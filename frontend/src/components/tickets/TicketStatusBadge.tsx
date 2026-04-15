/**
 * TicketStatusBadge
 *
 * Color-coded badge displaying a ticket's current status.
 * Colors are chosen for quick visual scanning on the dashboard.
 * Text labels are always present — we don't rely solely on color
 * for accessibility (colorblind users).
 */

import { Badge } from "@/components/ui/badge"
import { formatStatus } from "@/lib/utils"
import type { TicketStatus } from "@/types"

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  in_progress: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
  waiting_on_customer: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  resolved: "bg-green-100 text-green-800 hover:bg-green-100",
  closed: "bg-gray-100 text-gray-800 hover:bg-gray-100",
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {formatStatus(status)}
    </Badge>
  )
}
