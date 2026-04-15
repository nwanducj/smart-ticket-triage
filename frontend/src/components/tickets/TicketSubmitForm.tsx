/**
 * TicketSubmitForm
 *
 * Customer-facing ticket submission form. Public — no authentication required.
 * Validates inputs client-side, submits to the API, and shows success/error
 * feedback inline. Designed to be minimal and fast — a customer should be
 * able to submit a ticket in under 30 seconds.
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useCreateTicket } from "@/hooks/useCreateTicket"

export function TicketSubmitForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successId, setSuccessId] = useState<string | null>(null)

  const createTicket = useCreateTicket()

  /** Client-side validation matching backend Zod schemas. */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = "Title is required"
    } else if (title.length > 500) {
      newErrors.title = "Title cannot exceed 500 characters"
    }

    if (!description.trim()) {
      newErrors.description = "Description is required"
    } else if (description.length > 5000) {
      newErrors.description = "Description cannot exceed 5000 characters"
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      newErrors.customerEmail = "Please provide a valid email address"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessId(null)

    if (!validate()) return

    try {
      const result = await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
      })

      // Show success and reset form.
      setSuccessId(result.data.id)
      setTitle("")
      setDescription("")
      setCustomerEmail("")
      setErrors({})
    } catch {
      // Error is already handled by the mutation — extract from error state.
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Submit a Support Ticket</CardTitle>
        <CardDescription>
          Describe your issue and we&apos;ll get back to you as soon as
          possible. Our AI system will automatically categorize and prioritize
          your ticket.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Success Message */}
        {successId && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            <p className="font-medium">Ticket submitted successfully!</p>
            <p className="text-sm mt-1">
              Your ticket ID is: <code className="font-mono">{successId}</code>
            </p>
            <p className="text-sm mt-1">
              We&apos;ll review your request and get back to you shortly.
            </p>
          </div>
        )}

        {/* Error Message (from mutation) */}
        {createTicket.isError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <p className="font-medium">Failed to submit ticket</p>
            <p className="text-sm mt-1">
              {createTicket.error instanceof Error
                ? createTicket.error.message
                : "An unexpected error occurred. Please try again."}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief summary of your issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Please describe your issue in detail. Include any error messages, steps to reproduce, or relevant context."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={6}
              aria-invalid={!!errors.description}
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/5000
            </p>
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label htmlFor="customerEmail">Your Email</Label>
            <Input
              id="customerEmail"
              type="email"
              placeholder="you@example.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              aria-invalid={!!errors.customerEmail}
            />
            {errors.customerEmail && (
              <p className="text-sm text-red-600">{errors.customerEmail}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size={"lg"}
            className="w-full"
            disabled={createTicket.isPending}
          >
            {createTicket.isPending ? "Submitting..." : "Submit Ticket"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
