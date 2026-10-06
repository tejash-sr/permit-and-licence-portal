"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";

type PermitDetail = {
  name: string;
  status: string;
  permit_type: string;
  application_date: string;
  current_stage: string;
  overall_ai_confidence: number | null;
  ai_reasoning: string | null;
  ai_report?: any;
  decision_remarks: string | null;
  final_decision_by: string | null;
  final_decision_timestamp: string | null;
  stages: { stage_name: string; status: string; agency?: string; completed_on?: string }[];
  cross_agency_deltas: { field: string; agency_a_value: string; agency_b_value: string }[];
  state_transition_log: { from_status: string; to_status: string; timestamp: string; actor: string }[];
};

export default function CitizenApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PermitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetch(`/api/citizen/applications/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setData(d.data);
      })
      .catch((e) => setError(e.message || "Could not load this application."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (id) load();

    // Poll every 5s if application is under review or in progress
    const interval = setInterval(() => {
      if (id) {
        fetch(`/api/citizen/applications/${id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.ok && d.data) setData(d.data);
          })
          .catch(() => { });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorBanner message={error} onRetry={load} />
      </div>
    );
  }

  // Extract structured report if present
  const reportObj = data?.ai_report || {};
  const citizenReport = reportObj.citizen_report || reportObj;
  const statusUpper = data?.status?.toUpperCase() || "";
  const isDecided = statusUpper === "APPROVED" || statusUpper === "REJECTED" || statusUpper === "ACTIVE";
  const isApproved = statusUpper === "APPROVED" || statusUpper === "ACTIVE";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/citizen/applications" className="text-xs text-blue-600 hover:text-blue-800 transition-colors mb-2 inline-block">
            ← Back to My Applications
          </Link>
          {loading ? (
            <>
              <Skeleton className="h-7 w-64" />
              <Skeleton className="mt-2 h-4 w-40" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{data?.permit_type}</h1>
                {data && <StatusBadge status={data.status} />}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {data?.name} · Submitted {data?.application_date}
              </p>
            </>
          )}
        </div>
      </div>

      {/* AI Report Card */}
      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <CardHeader
          title="✨ AI Evaluation & Decision Summary"
          subtitle="Automated intelligence verification results and recommendations"
        />
        <div className="p-6">
          {loading ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6">
              <Spinner size={20} className="text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">Analyzing application & running OCR verification…</p>
                <SkeletonText lines={2} className="mt-2" />
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Overall Assessment</p>
                  <p className="text-2xl font-bold text-blue-950 mt-0.5">
                    {data.overall_ai_confidence !== null
                      ? `${Math.round(data.overall_ai_confidence * (data.overall_ai_confidence <= 1 ? 100 : 1))}%`
                      : "Evaluating…"}
                  </p>
                </div>
                <div className="w-full sm:w-64">
                  <ConfidenceMeter value={data.overall_ai_confidence} status={data.status} />
                </div>
              </div>

              {/* If decided, show final resolution block */}
              {isDecided ? (
                <div className={`rounded-xl border p-5 ${isApproved ? "bg-emerald-50/40 border-emerald-200" : "bg-rose-50/40 border-rose-200"}`}>
                  {data.final_decision_by || data.decision_remarks ? (
                    /* Human Decision case */
                    <>
                      <h4 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${isApproved ? "text-emerald-800" : "text-rose-800"}`}>
                        {isApproved ? (
                          <>
                            <span>✅</span> Application Officially Approved
                          </>
                        ) : (
                          <>
                            <span>❌</span> Application Officially Rejected
                          </>
                        )}
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500">
                        The reviewing officer has evaluated your application and recorded a final decision.
                      </p>
                      {data.decision_remarks && (
                        <div className="mt-4 bg-white rounded-xl border border-slate-100 p-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Review Outcome Details</p>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium mt-1 italic">"{data.decision_remarks}"</p>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Automated AI/Flowise decision case */
                    <>
                      <h4 className={`text-sm font-bold uppercase tracking-wider flex items-center gap-1.5 ${isApproved ? "text-emerald-800" : "text-rose-800"}`}>
                        {isApproved ? (
                          <>
                            <span>✅</span> Application Automatically Approved
                          </>
                        ) : (
                          <>
                            <span>❌</span> Application Automatically Rejected
                          </>
                        )}
                      </h4>
                      <p className="mt-1.5 text-xs text-slate-500">
                        This application has been automatically processed based on compliance validation checks.
                      </p>
                      {(citizenReport?.summary || citizenReport?.explanation || data.ai_reasoning) && (
                        <div className="mt-4 space-y-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Summary Findings</p>
                          <div className="rounded-xl bg-white p-4 border border-slate-100 text-sm text-slate-700 leading-relaxed">
                            {citizenReport.summary || citizenReport.explanation || data.ai_reasoning}
                          </div>
                        </div>
                      )}
                      {(citizenReport?.problems && citizenReport.problems.length > 0) && (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                            <span>⚠️</span> Compliance Issues ({citizenReport.problems.length})
                          </p>
                          <ul className="space-y-1.5 list-disc pl-4 text-sm text-rose-900 leading-relaxed">
                            {citizenReport.problems.map((prob: string, i: number) => (
                              <li key={i}>{prob}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(citizenReport?.next_steps || citizenReport?.solution) && (
                        <div className="mt-4 bg-blue-50/50 rounded-xl border border-blue-100 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Recommended Next Steps</p>
                          <p className="text-sm text-blue-950 mt-1 leading-relaxed">
                            {Array.isArray(citizenReport.next_steps) 
                              ? citizenReport.next_steps.join(" ") 
                              : citizenReport.next_steps || citizenReport.solution}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Else show standard pending AI summary findings / reasoning */
                <>
                  {citizenReport?.explanation || citizenReport?.summary || data.ai_reasoning ? (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-900">Summary Findings</h4>
                      <div className="rounded-xl bg-slate-50 p-4 border border-slate-200/60 text-sm text-slate-700 leading-relaxed">
                        {citizenReport?.explanation || citizenReport?.summary || data.ai_reasoning}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50/60 border border-amber-200/60 p-4 text-sm text-amber-800 flex items-center gap-2">
                      <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Verification in progress. The detailed AI report card will populate once stage evaluations complete.</span>
                    </div>
                  )}

                  {/* Detailed Breakdown: Reason & Next Steps if available */}
                  {(citizenReport?.reason || citizenReport?.solution || citizenReport?.next_steps) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      {citizenReport.reason && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary Analysis Reason</p>
                          <p className="mt-1.5 text-sm text-slate-800">{citizenReport.reason}</p>
                        </div>
                      )}
                      {(citizenReport.solution || citizenReport.next_steps) && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Recommended Next Steps</p>
                          <p className="mt-1.5 text-sm text-blue-950">{citizenReport.solution || citizenReport.next_steps}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      </Card>


      {/* Discrepancies */}
      {!loading && data && data.cross_agency_deltas.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader title="Cross-agency Discrepancies" subtitle="Discrepancies identified between official government registries" />
          <div className="divide-y divide-slate-100">
            {data.cross_agency_deltas.map((d, i) => (
              <div key={i} className="px-5 py-4 text-sm bg-amber-50/30">
                <p className="font-medium text-amber-900">{d.field}</p>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-medium">{d.agency_a_value}</span> vs <span className="font-medium">{d.agency_b_value}</span>
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Activity Log */}
      {!loading && data && data.state_transition_log.length > 0 && (
        <Card>
          <CardHeader title="Activity Log" />
          <div className="divide-y divide-slate-100">
            {data.state_transition_log.map((t, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 text-sm">
                <span className="text-slate-700">
                  {t.from_status} → {t.to_status}
                </span>
                <span className="text-xs text-slate-400">
                  {t.actor} · {t.timestamp}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
