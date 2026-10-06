"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/ui/LanguageContext";

type QueueItem = {
  name: string;
  permit_type: string;
  status: string;
  current_stage: string;
  overall_ai_confidence: number | null;
  application_date: string;
};

type CaseItem = {
  name: string;
  permit_type: string;
  status: string;
  current_stage: string;
  overall_ai_confidence: number | null;
  application_date: string;
};

type CasesData = {
  assigned: CaseItem[];
  reviewed: CaseItem[];
};

export default function OfficerDashboardPage() {
  const router = useRouter();
  const { push } = useToast();
  const { t } = useLanguage();

  const [queue, setQueue] = useState<QueueItem[] | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  const [cases, setCases] = useState<CasesData | null>(null);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState<string | null>(null);

  const [claiming, setClaiming] = useState<string | null>(null);

  function loadQueue(silent = false) {
    if (!silent) setQueueLoading(true);
    setQueueError(null);
    fetch("/api/officer/queue")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setQueue(d.data);
      })
      .catch((e) => {
        if (!silent) setQueueError(e.message || "Could not load the review queue.");
      })
      .finally(() => {
        if (!silent) setQueueLoading(false);
      });
  }

  function loadCases(silent = false) {
    if (!silent) setCasesLoading(true);
    setCasesError(null);
    fetch("/api/officer/cases")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        if (Array.isArray(d.data)) {
          const assigned = d.data.filter((p: any) => 
            ["Human Review", "Under Review", "Conditional Approval", "Applied"].includes(p.status)
          );
          const reviewed = d.data.filter((p: any) => 
            ["Approved", "Rejected"].includes(p.status)
          );
          setCases({ assigned, reviewed });
        } else {
          setCases({
            assigned: d.data?.assigned || [],
            reviewed: d.data?.reviewed || [],
          });
        }
      })
      .catch((e) => {
        if (!silent) setCasesError(e.message || "Could not load your assigned cases.");
      })
      .finally(() => {
        if (!silent) setCasesLoading(false);
      });
  }

  useEffect(() => {
    loadQueue();
    loadCases();

    const interval = setInterval(() => {
      loadQueue(true);
      loadCases(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  async function claim(permitId: string) {
    setClaiming(permitId);
    try {
      const res = await fetch(`/api/officer/cases/${permitId}/accept`, { method: "POST" });
      const data = await res.json();
      if (res.status === 409) {
        push(data.error, "error");
        loadQueue();
        return;
      }
      if (!res.ok || !data.ok) {
        push(data.error ?? "Could not claim this case", "error");
        return;
      }
      push("Case claimed — opening review workspace", "success");
      router.push(`/officer/cases/${permitId}`);
    } catch {
      push("Network error while claiming. Try again.", "error");
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{t("officer.dashboard")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("officer.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("officer.my_cases")} subtitle="Permits currently assigned to you for review" />
        <div className="divide-y divide-slate-100">
          {casesLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : casesError ? (
            <div className="p-5">
              <ErrorBanner message={casesError} onRetry={loadCases} />
            </div>
          ) : cases && cases.assigned?.length > 0 ? (
            cases.assigned.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{c.permit_type}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.name} · Stage: {c.current_stage || "—"}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <ConfidenceMeter value={c.overall_ai_confidence} status={c.status} />
                </div>
                <StatusBadge status={c.status} />
                <Button variant="secondary" onClick={() => router.push(`/officer/cases/${c.name}`)}>
                  {t("officer.open")}
                </Button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">No cases assigned to you yet.</div>
          )}
        </div>
      </Card>

      {/* History / Reviewed cases card */}
      <Card>
        <CardHeader title="My reviewed cases" subtitle="History of permits you have approved or rejected" />
        <div className="divide-y divide-slate-100">
          {casesLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : casesError ? (
            <div className="p-5">
              <ErrorBanner message={casesError} onRetry={loadCases} />
            </div>
          ) : cases && cases.reviewed?.length > 0 ? (
            cases.reviewed.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-4 px-5 py-4 bg-slate-50/20">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{c.permit_type}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {c.name} · Completed Review
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <ConfidenceMeter value={c.overall_ai_confidence} status={c.status} />
                </div>
                <StatusBadge status={c.status} />
                <Button variant="secondary" onClick={() => router.push(`/officer/cases/${c.name}`)}>
                  View Details
                </Button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">No reviewed cases history found.</div>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title={t("officer.queue")} />
        <div className="divide-y divide-slate-100">
          {queueLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : queueError ? (
            <div className="p-5">
              <ErrorBanner message={queueError} onRetry={loadQueue} />
            </div>
          ) : queue && queue.length > 0 ? (
            queue.map((q) => (
              <div key={q.name} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{q.permit_type}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {q.name} · Submitted {q.application_date}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <ConfidenceMeter value={q.overall_ai_confidence} />
                </div>
                <Button onClick={() => claim(q.name)} loading={claiming === q.name} disabled={claiming !== null && claiming !== q.name}>
                  {claiming === q.name ? "..." : t("officer.accept")}
                </Button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">Queue is empty — nothing waiting for review.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
