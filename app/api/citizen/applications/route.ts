import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet } from "@/lib/frappe";

export async function GET(req: NextRequest) {
  const session = getSession(req, "citizen");
  if (!session) return unauthorized();

  try {
    const applicantKeys = [session.id, session.extra?.emirates_id, session.email].filter(Boolean) as string[];
    let data = await frappeGet("Permit", {
      filters: [["applicant", "in", applicantKeys]],
      fields: ["name", "status", "permit_type", "application_date", "current_stage", "overall_ai_confidence"],
      limit: 50,
      order_by: "creation desc",
    }).catch(() => []);

    if (data.length === 0 && session.email) {
      try {
        const cleanEmail = session.email.trim();
        data = await frappeGet("Permit", {
          // Use like filter to be insensitive to trailing/leading spaces in the database
          filters: [["applicant_email", "like", `%${cleanEmail}%`]],
          fields: ["name", "status", "permit_type", "application_date", "current_stage", "overall_ai_confidence"],
          limit: 50,
          order_by: "creation desc",
        });
      } catch {
        // Ignore if applicant_email field does not exist
      }
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return serverError(err);
  }
}
