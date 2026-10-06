"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";

type Application = {
  name: string;
  status: string;
  permit_type: string;
  application_date: string;
  current_stage: string;
  overall_ai_confidence: number | null;
};

export default function CitizenApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  function load() {
    setLoading(true);
    setError(null);
    fetch("/api/citizen/applications")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setApps(d.data);
      })
      .catch((e) => setError(e.message || "Could not load applications."))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = apps?.filter((a) => (filter === "all" ? true : a.status === filter)) ?? [];
  const statuses = Array.from(new Set(apps?.map((a) => a.status) ?? []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">My Applications</h1>
        <Link href="/citizen/apply" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          + New application
        </Link>
      </div>

      {!loading && apps && apps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
          >
            All ({apps.length})
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              {s} ({apps.filter((a) => a.status === s).length})
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardHeader title="All applications" />
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="space-y-4 p-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <ErrorBanner message={error} onRetry={load} />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((a) => (
              <Link key={a.name} href={`/citizen/applications/${a.name}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{a.permit_type}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {a.name} · Submitted {a.application_date} · Stage: {a.current_stage || "—"}
                  </p>
                </div>
                <div className="w-32 shrink-0">
                  <ConfidenceMeter value={a.overall_ai_confidence} status={a.status} />
                </div>
                <StatusBadge status={a.status} />
              </Link>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-slate-500">No applications match this filter.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
