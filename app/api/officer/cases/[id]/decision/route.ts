import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeCallMethod, frappeUpdate } from "@/lib/frappe";

const VALID_DECISIONS = new Set(["APPROVED", "REJECTED"]);

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const { decision, remarks } = await req.json();
    if (!VALID_DECISIONS.has(decision)) {
      return NextResponse.json({ ok: false, error: "Decision must be APPROVED or REJECTED" }, { status: 400 });
    }

    const nowStr = new Date().toISOString().replace("T", " ").substring(0, 19);

    // Call RPC method first
    const result = await frappeCallMethod("permit_portal.api.record_decision", {
      permit_id: id,
      officer_id: session.id,
      decision,
      remarks: remarks ?? "",
    }).catch(() => ({ ok: false }));

    // Fallback/Supplement: Directly write the decision fields to guarantee they persist in ERPNext
    const statusMap: Record<string, string> = {
      APPROVED: "Approved",
      REJECTED: "Rejected",
    };

    await frappeUpdate("Permit", id, {
      status: statusMap[decision],
      decision_remarks: remarks ?? "",
      override_reason: remarks ?? "",
      final_decision_by: session.id,
      final_decision_timestamp: nowStr,
    });

    return NextResponse.json({ ok: true, data: { status: statusMap[decision] } });
  } catch (err) {
    return serverError(err);
  }
}
