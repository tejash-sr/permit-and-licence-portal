import { NextRequest, NextResponse } from "next/server";
import { getSession, unauthorized, serverError } from "@/lib/auth-helpers";
import { frappeGetDoc, frappeGet } from "@/lib/frappe";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSession(req, "officer");
  if (!session) return unauthorized();

  try {
    const { id } = await params;
    const permit = await frappeGetDoc<any>("Permit", id);
    if (!permit) return NextResponse.json({ ok: false, error: "Case not found" }, { status: 404 });

    // Parse ai_report_json
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

    // Query attached files from Frappe File manager linked to this Permit record (matching user's filter)
    const attachedFiles = await frappeGet<any>("File", {
      filters: [
        ["attached_to_name", "=", id],
      ],
      fields: ["file_name", "file_url"],
      limit: 50,
    }).catch((err) => {
      console.error("Failed to query files from Frappe:", err);
      return [];
    });

    console.log("Found attached files from ERPNext:", attachedFiles);

    const documents = attachedFiles.map((f: any) => {
      return {
        doc_type_code: f.file_name,
        document_name: f.file_name,
        file_url: `/api/officer/files?url=${encodeURIComponent(f.file_url)}`,
      };
    });

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
        applicant_name: permit.applicant_name,
        application_date: permit.application_date,
        current_stage: permit.current_stage,
        assigned_officer: permit.assigned_officer,
        overall_ai_confidence: overallConfidence ?? null,
        ai_reasoning: permit.ai_reasoning ?? null,
        ai_report: aiReportParsed,
        decision_remarks: permit.decision_remarks ?? permit.override_reason ?? permit.rejection_reason ?? null,
        final_decision_by: permit.final_decision_by ?? null,
        final_decision_timestamp: permit.final_decision_timestamp ?? null,
        forgery_flags: (permit.conditions || [])
          .filter((c: any) => c.condition_type && c.condition_type.toLowerCase().includes("forgery") && c.ai_reasoning)
          .map((c: any) => ({
            document: c.doc_type_code || "Document",
            issue: c.ai_reasoning,
            severity: "High",
          })),
        deadline_status: permit.deadline_status ?? null,
        deadline_at: permit.deadline_at ?? null,
        sla_due_at: permit.sla_due_at ?? null,
        sla_breached: permit.sla_breached ?? false,
        documents: documents.length > 0 ? documents : (permit.documents || []).map((doc: any) => {
          return {
            doc_type_code: doc.doc_type_code,
            document_name: doc.document_name || doc.doc_type_code,
            file_url: `/api/officer/files?url=${encodeURIComponent(doc.file_url)}`,
          };
        }),
        cross_agency_deltas: (() => { try { return JSON.parse(permit.cross_agency_summary || "[]"); } catch { return []; } })(),
        extracted_entities: permit.extracted_entities ?? null,
        stages: permit.approval_stages ?? [],
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
