import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet } from "@/lib/frappe";

// Unclaimed cases needing human review.
export async function GET(req: NextRequest) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const data = await frappeGet("Permit", {
      filters: [
        ["status", "=", "Human Review"],
        ["assigned_officer", "in", ["", null]],
      ],
      fields: ["name", "permit_type", "status", "current_stage", "overall_ai_confidence", "application_date"],
      limit: 50,
      order_by: "application_date asc",
    });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return serverError(err);
  }
}
