import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet } from "@/lib/frappe";

export async function GET(req: NextRequest) {
  const session = getSession(req, "admin");
  if (!session) return unauthorized();

  try {
    const [pending, underReview, approved, rejected, breached] = await Promise.all([
      frappeGet("Permit", { filters: [["status", "=", "Submitted"]], fields: ["name"], limit: 1000 }),
      frappeGet("Permit", { filters: [["status", "=", "Under Review"]], fields: ["name"], limit: 1000 }),
      frappeGet("Permit", { filters: [["status", "=", "Approved"]], fields: ["name"], limit: 1000 }),
      frappeGet("Permit", { filters: [["status", "=", "Rejected"]], fields: ["name"], limit: 1000 }),
      frappeGet("Permit", { filters: [["sla_breached", "=", 1]], fields: ["name", "permit_type", "current_stage", "sla_due_at"], limit: 50 }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          submitted: pending.length,
          under_review: underReview.length,
          approved: approved.length,
          rejected: rejected.length,
        },
        sla_breaches: breached,
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
