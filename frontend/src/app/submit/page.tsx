/**
 * Public Ticket Submission Page
 *
 * Customers use this page to submit support tickets without logging in.
 * The form handles validation, submission, and feedback.
 */

import { TicketSubmitForm } from "@/components/tickets/TicketSubmitForm"
import Link from "next/link"

export default function SubmitPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-2xl space-y-4">
        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:underline"
          >
            &larr; Back to Home
          </Link>
        </div>
        <TicketSubmitForm />
      </div>
    </main>
  )
}
