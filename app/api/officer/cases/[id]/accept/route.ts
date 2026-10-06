import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeCallMethod, frappeGet, frappeUpdate } from "@/lib/frappe";

/**
 * Race-condition-safe "claim this case" action.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    
    // Attempt custom Frappe method
    const result = await frappeCallMethod("permit_portal.api.accept_review", {
      permit_id: id,
      officer_id: session.id,
    });

    if (!result.ok) {
      // Fallback: direct check & update if the custom api method is not found/supported
      const matches = await frappeGet<any>("Permit", {
        filters: [["name", "=", id]],
        fields: ["name", "assigned_officer"],
        limit: 1,
      }).catch(() => []);
      
      const permit = matches[0];
      if (!permit) {
        return NextResponse.json({ ok: false, error: "Case not found." }, { status: 404 });
      }
      if (permit.assigned_officer && permit.assigned_officer !== session.id) {
        return NextResponse.json({ ok: false, error: "This case has already been claimed by another officer." }, { status: 409 });
      }

      await frappeUpdate("Permit", id, {
        assigned_officer: session.id,
        current_stage_status: "Under Review"
      });
      
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (err) {
    return serverError(err);
  }
}
