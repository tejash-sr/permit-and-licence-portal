"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { SkeletonCard, Skeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";
import { useLanguage } from "@/components/ui/LanguageContext";

type Profile = { 
  full_name: string; 
  email: string; 
  emirates_id: string; 
  phone: string; 
  nationality: string;
  date_of_birth: string;
  gender: string;
  card_expiry_date: string;
};

type Application = {
  name: string;
  status: string;
  permit_type: string;
  application_date: string;
  current_stage: string;
  overall_ai_confidence: number | null;
};

export default function CitizenDashboardPage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [appsLoading, setAppsLoading] = useState(true);

  // Tabs: "overview" | "profile"
  const [activeTab, setActiveTab] = useState<"overview" | "profile">("overview");

  function loadProfile() {
    setProfileLoading(true);
    setProfileError(null);
    fetch("/api/citizen/auth/me")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => setProfileError("Could not load your profile."))
      .finally(() => setProfileLoading(false));
  }

  function loadApps(silent = false) {
    if (!silent) setAppsLoading(true);
    fetch("/api/citizen/applications")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setApps(d.data);
      })
      .catch((e) => {
        if (!silent) setAppsError(e.message || "Could not load applications.");
      })
      .finally(() => {
        if (!silent) setAppsLoading(false);
      });
  }

  useEffect(() => {
    loadProfile();
    loadApps();

    const interval = setInterval(() => loadApps(true), 3000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = apps?.filter((a) => !["Approved", "Rejected"].includes(a.status)).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {profileLoading ? <Skeleton className="h-7 w-56" /> : `${t("citizen.welcome")}, ${profile?.full_name ?? ""}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t("citizen.track_subtitle")}</p>
        </div>
        <Link
          href="/citizen/apply"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {t("citizen.new_app")}
        </Link>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t("citizen.tab_overview")}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "profile"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {t("citizen.tab_profile")}
          </button>
        </nav>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("citizen.active_apps")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{appsLoading ? <Skeleton className="h-8 w-12" /> : activeCount}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("citizen.total_apps")}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{appsLoading ? <Skeleton className="h-8 w-12" /> : apps?.length ?? 0}</p>
            </Card>
            <Card className="p-5 bg-blue-50/50 border-blue-100">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600/70">{t("citizen.emirates_id")}</p>
              <p className="mt-2 text-lg font-medium text-blue-900">{profileLoading ? <Skeleton className="h-6 w-32" /> : profile?.emirates_id ?? "—"}</p>
            </Card>
          </div>

          <Card>
            <CardHeader title={t("citizen.recent_apps")} subtitle={t("citizen.live_tracking")} />
            <div className="divide-y divide-slate-100">
              {appsLoading ? (
                <div className="space-y-3 p-5">
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : appsError ? (
                <div className="p-5">
                  <ErrorBanner message={appsError} onRetry={loadApps} />
                </div>
              ) : apps && apps.length > 0 ? (
                apps.slice(0, 5).map((a) => (
                  <Link
                    key={a.name}
                    href={`/citizen/applications/${a.name}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{a.permit_type}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.name} · Stage: {a.current_stage || "—"}
                      </p>
                    </div>
                    <div className="w-32 shrink-0">
                      <ConfidenceMeter value={a.overall_ai_confidence} status={a.status} />
                    </div>
                    <StatusBadge status={a.status} />
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">
                  {t("citizen.no_apps")}{" "}
                  <Link href="/citizen/apply" className="font-medium text-blue-600 underline underline-offset-2">
                    {t("citizen.start_first")}
                  </Link>
                  .
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "profile" && (
        <div className="animate-fade-in space-y-6">
          {profileError && <ErrorBanner message={profileError} onRetry={loadProfile} />}
          
          <Card>
            <CardHeader title={t("citizen.gov_profile")} subtitle={t("citizen.gov_subtitle")} />
            <div className="p-5">
              {profileLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : profile ? (
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.full_name")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.full_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.emirates_id")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.emirates_id}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.email")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.email || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.phone")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.nationality")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.nationality || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.gender")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.gender || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.dob")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.date_of_birth || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500">{t("citizen.expiry")}</dt>
                    <dd className="mt-1 text-sm text-slate-900">{profile.card_expiry_date || "—"}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
