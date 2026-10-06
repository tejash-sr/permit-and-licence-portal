"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";
import { useToast } from "@/components/ui/Toast";

type CaseDetail = {
  name: string;
  status: string;
  permit_type: string;
  applicant_name: string;
  application_date: string;
  current_stage: string;
  assigned_officer: string | null;
  overall_ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_report?: any;
  decision_remarks: string | null;
  final_decision_by: string | null;
  final_decision_timestamp: string | null;
  forgery_flags: { document: string; issue: string; severity: string }[];
  deadline_status: "ON_TRACK" | "AT_RISK" | "BREACHED" | null;
  deadline_at: string | null;
  sla_due_at: string | null;
  sla_breached: boolean;
  documents: { doc_type_code: string; document_name: string; file_url: string }[];
  cross_agency_deltas: { field: string; agency_a_value: string; agency_b_value: string }[];
  extracted_entities: Record<string, unknown> | null;
};

export default function OfficerCaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { push } = useToast();

  const [data, setData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [deciding, setDeciding] = useState<string | null>(null);
  const [showModalUrl, setShowModalUrl] = useState<string | null>(null);
  const [activeDocName, setActiveDocName] = useState<string>("");
  const [showAuditRaw, setShowAuditRaw] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    fetch(`/api/officer/cases/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setData(d.data);
      })
      .catch((e) => setError(e.message || "Could not load this case."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setDeciding(decision);
    try {
      const res = await fetch(`/api/officer/cases/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, remarks }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        push(d.error ?? "Could not record decision", "error");
        return;
      }
      push(`Decision recorded: ${decision}`, "success");
      load(); // Reload case detail to lock workspace and show read-only details
    } catch {
      push("Network error while recording decision. Try again.", "error");
    } finally {
      setDeciding(null);
    }
  }

  if (error) return <ErrorBanner message={error} onRetry={load} />;

  const officerReport = data?.ai_report?.officer_report;
  const auditJson = data?.ai_report?.audit_json;
  const isDecided = data?.status === "Approved" || data?.status === "Rejected";

  return (
    <div className="space-y-6 relative">
      {/* Back Button */}
      <div>
        <button
          onClick={() => router.push("/officer/dashboard")}
          className="group flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
        >
          <svg className="h-4 w-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      {/* Title & Status */}
      <div>
        {loading ? (
          <>
            <Skeleton className="h-7 w-72" />
            <Skeleton className="mt-2 h-4 w-40" />
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{data?.permit_type}</h1>
              {data && <StatusBadge status={data.status} />}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {data?.name} · Applicant: {data?.applicant_name} · Submitted {data?.application_date}
            </p>
          </>
        )}
      </div>

      {/* AI Evaluation Report Card */}
      <Card>
        <CardHeader title="AI Evaluation Report" subtitle="Automated scoring, category compliance, and verification flags" />
        <div className="space-y-4 p-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
              <Spinner size={20} className="text-slate-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Loading AI findings…</p>
                <SkeletonText lines={2} className="mt-2" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfidenceMeter value={data?.overall_ai_confidence} />
                {officerReport && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-500">AI Classification & Scores</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Recommendation:</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        officerReport.ai_recommendation === "Auto Approve" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {officerReport.ai_recommendation}
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      Overall Score: <span className="font-bold text-blue-700">{officerReport.overall_score || officerReport.score_percentage}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Compliance Categories */}
              {officerReport?.category_scores && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-3 bg-white">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Compliance Category Checklist</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(officerReport.category_scores).map(([category, score]) => {
                      const scoreVal = Number(score);
                      const badgeColor = scoreVal >= 90 ? "text-emerald-700 bg-emerald-50 border-emerald-200" : scoreVal >= 60 ? "text-amber-700 bg-amber-50 border-amber-200" : "text-rose-700 bg-rose-50 border-rose-200";
                      return (
                        <div key={category} className="flex flex-col gap-1 rounded-lg border border-slate-100 p-2 text-center bg-slate-50/40">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase truncate" title={category}>{category.replace("_", " ")}</span>
                          <span className={`inline-block rounded-md border py-0.5 text-xs font-bold ${badgeColor}`}>{scoreVal}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning Flags */}
              {officerReport?.flags && officerReport.flags.length > 0 && (
                <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                    <span>⚠️</span> Verification Warning Flags ({officerReport.flags.length})
                  </p>
                  <ul className="space-y-1.5 list-disc pl-4 text-sm text-rose-900 leading-relaxed">
                    {officerReport.flags.map((flag: string, i: number) => (
                      <li key={i}>{flag}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Document Summary Table */}
              {officerReport?.document_summary && officerReport.document_summary.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Document Checks Summary</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {officerReport.document_summary.map((summary: any, idx: number) => (
                      <div key={idx} className="px-4 py-3 text-xs md:text-sm flex flex-col md:flex-row md:items-center md:justify-between gap-2 hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="font-semibold text-slate-900">{summary.filename}</p>
                          <p className="text-[11px] text-slate-400">Type: {summary.detected_type}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${summary.virus === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>Virus: {summary.virus}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${summary.pdf_validation === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>PDF: {summary.pdf_validation}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${summary.ocr === "PASS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>OCR: {summary.ocr}</span>
                          <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${summary.identity_match === "MATCH" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : summary.identity_match === "NOT_FOUND" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>Identity: {summary.identity_match}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw Audit */}
              {auditJson && (
                <div className="border-t border-slate-100 pt-3">
                  <button 
                    onClick={() => setShowAuditRaw(!showAuditRaw)} 
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 outline-none transition-colors"
                  >
                    <span>{showAuditRaw ? "▼ Hide Raw Audit Log" : "▶ Show Raw Audit Log"}</span>
                  </button>
                  {showAuditRaw && (
                    <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-[11px] font-mono leading-relaxed text-slate-300 max-h-[300px]">
                      {JSON.stringify(auditJson, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Submitted Documents Card */}
      <Card>
        <CardHeader title="Submitted documents" subtitle="Click a document below to open it in a popup viewer" />
        <div className="flex flex-wrap gap-4 p-5">
          {loading ? (
            <div className="space-y-2 w-full">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : data && data.documents.length > 0 ? (
            data.documents.map((doc) => (
              <button
                key={doc.doc_type_code}
                onClick={() => {
                  setShowModalUrl(doc.file_url);
                  setActiveDocName(doc.document_name);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-800 hover:underline font-medium shadow-sm transition-all"
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>{doc.document_name}</span>
              </button>
            ))
          ) : (
            <div className="text-center text-sm text-slate-400 w-full py-4">No documents attached.</div>
          )}
        </div>
      </Card>

      {/* Discrepancies */}
      {!loading && data && data.cross_agency_deltas.length > 0 && (
        <Card>
          <CardHeader title="Cross-agency discrepancies" />
          <div className="divide-y divide-slate-100">
            {data.cross_agency_deltas.map((d, i) => (
              <div key={i} className="px-5 py-3.5 text-sm">
                <p className="font-medium text-slate-900">{d.field}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {d.agency_a_value} <span className="mx-1 text-slate-300">vs</span> {d.agency_b_value}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Review Result & Decision Card */}
      {isDecided ? (
        <Card>
          <CardHeader title="Final Decision Record" subtitle="This case has already been resolved and is closed." />
          <div className="p-5 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Decision Outcome</p>
                <div className="mt-1">
                  <StatusBadge status={data.status} />
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Reviewed By</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{data.final_decision_by || data.assigned_officer || "—"}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">Decision Timestamp</p>
                <p className="mt-1 text-sm text-slate-700 font-mono">{data.final_decision_timestamp || "—"}</p>
              </div>
            </div>
            {data.decision_remarks && (
              <div className="rounded-xl border border-slate-200 p-4 bg-white">
                <p className="text-xs font-semibold text-slate-500 mb-1">Review Result / Decision Reason</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{data.decision_remarks}"</p>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader title="Review Result & Decision" subtitle="Your decision is final for this stage" />
          <div className="space-y-4 p-5">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Review result, reason for approval / reject"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => decide("APPROVED")} loading={deciding === "APPROVED"} disabled={loading || deciding !== null}>
                Approve
              </Button>
              <Button variant="danger" onClick={() => decide("REJECTED")} loading={deciding === "REJECTED"} disabled={loading || deciding !== null}>
                Reject
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Document Inspection Popup Modal (Lightbox) */}
      {showModalUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-bold text-slate-800 truncate max-w-lg">{activeDocName || "Document Preview"}</span>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={showModalUrl}
                  download
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
                <button
                  onClick={() => {
                    setShowModalUrl(null);
                    setActiveDocName("");
                  }}
                  className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 transition-colors outline-none"
                  aria-label="Close Preview"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Modal Body */}
            <div className="flex-1 bg-slate-100 p-4">
              <iframe
                src={showModalUrl}
                className="h-full w-full rounded-xl border border-slate-300 bg-white"
                title="Document Preview Frame"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
