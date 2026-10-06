import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGetDoc } from "@/lib/frappe";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req, "citizen");
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const permit = await frappeGetDoc<any>("Permit", id);
    if (!permit) return NextResponse.json({ ok: false, error: "Application not found" }, { status: 404 });

    // Citizens may only view their own applications.
    // Match against session ID (Citizen Doc Name), Emirates ID, Name, or Email.
    const allowed = [
      session.id,
      session.extra?.emirates_id,
      session.email,
      session.name
    ].filter(Boolean);

    const isMatch =
      allowed.includes(permit.applicant) ||
      (session.email && permit.applicant_email?.trim() === session.email.trim()) ||
      (session.extra?.emirates_id && permit.emirates_id === session.extra.emirates_id);

    if (!isMatch) {
      return NextResponse.json({ ok: false, error: "Not your application" }, { status: 403 });
    }

    // Try parsing ai_report_json or ai_reasoning if it contains JSON
    let aiReportParsed = null;
    if (permit.ai_report_json) {
      try {
        aiReportParsed = typeof permit.ai_report_json === "string" ? JSON.parse(permit.ai_report_json) : permit.ai_report_json;
      } catch {
        aiReportParsed = null;
      }
    } else if (permit.ai_reasoning && (permit.ai_reasoning.startsWith("{") || permit.ai_reasoning.startsWith("["))) {
      try {
        aiReportParsed = JSON.parse(permit.ai_reasoning);
      } catch {
        aiReportParsed = null;
      }
    }

    // Fallback overall AI confidence lookup from report json if not set on main record
    let overallConfidence = permit.overall_ai_confidence;
    if (overallConfidence === null || overallConfidence === undefined) {
      if (aiReportParsed?.officer_report?.overall_score !== undefined) {
        overallConfidence = aiReportParsed.officer_report.overall_score / 100;
      } else if (aiReportParsed?.citizen_report?.score_percentage !== undefined) {
        overallConfidence = aiReportParsed.citizen_report.score_percentage / 100;
      } else if (aiReportParsed?.overall_score !== undefined) {
        overallConfidence = aiReportParsed.overall_score / 100;
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        name: permit.name,
        status: permit.status,
        permit_type: permit.permit_type,
        application_date: permit.application_date,
        current_stage: permit.current_stage,
        overall_ai_confidence: overallConfidence ?? null,
        ai_reasoning: permit.ai_reasoning ?? null,
        ai_report: aiReportParsed,
        decision_remarks: permit.decision_remarks ?? permit.override_reason ?? permit.rejection_reason ?? null,
        final_decision_by: permit.final_decision_by ?? null,
        final_decision_timestamp: permit.final_decision_timestamp ?? null,
        stages: permit.approval_stages ?? [],
        cross_agency_deltas: (() => { try { return JSON.parse(permit.cross_agency_summary || "[]"); } catch { return []; } })(),
        extracted_entities: permit.extracted_entities ?? null,
        state_transition_log: permit.state_transition ?? [],
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
