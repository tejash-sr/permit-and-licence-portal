import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGet } from "@/lib/frappe";

// Cases claimed/assigned to the signed-in officer, split by pending and reviewed history.
export async function GET(req: NextRequest) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const data = await frappeGet("Permit", {
      filters: [
        ["assigned_officer", "=", session.id]
      ],
      fields: ["name", "permit_type", "status", "current_stage", "overall_ai_confidence", "application_date"],
      limit: 100,
      order_by: "modified desc",
    });

    const assigned = data.filter((p: any) => 
      ["Human Review", "Under Review", "Conditional Approval", "Applied"].includes(p.status)
    );
    const reviewed = data.filter((p: any) => 
      ["Approved", "Rejected"].includes(p.status)
    );

    return NextResponse.json({ 
      ok: true, 
      data: { assigned, reviewed } 
    });
  } catch (err) {
    return serverError(err);
  }
}
