"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/ui/LanguageContext";

type Stats = {
  counts: { submitted: number; under_review: number; approved: number; rejected: number };
  sla_breaches: { name: string; permit_type: string; current_stage: string; sla_due_at: string }[];
};

type Officer = {
  name: string;
  officer_id: string;
  officer_name: string;
  email: string;
  agency: string;
  department: string;
  designation: string;
  availability: "Available" | "Busy" | "Offline";
};

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const { push } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [officers, setOfficers] = useState<Officer[] | null>(null);
  const [officersLoading, setOfficersLoading] = useState(true);
  const [officersError, setOfficersError] = useState<string | null>(null);

  // Add Officer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    officer_id: "",
    officer_name: "",
    email: "",
    agency: "Department of Economic Development",
    department: "Licensing",
    designation: "Senior Officer",
  });

  function loadStats(silent = false) {
    if (!silent) setStatsLoading(true);
    setStatsError(null);
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setStats(d.data);
      })
      .catch((e) => {
        if (!silent) setStatsError(e.message || "Could not load platform stats.");
      })
      .finally(() => {
        if (!silent) setStatsLoading(false);
      });
  }

  function loadOfficers(silent = false) {
    if (!silent) setOfficersLoading(true);
    setOfficersError(null);
    fetch("/api/admin/officers")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setOfficers(d.data);
      })
      .catch((e) => {
        if (!silent) setOfficersError(e.message || "Could not load officer roster.");
      })
      .finally(() => {
        if (!silent) setOfficersLoading(false);
      });
  }

  useEffect(() => {
    loadStats();
    loadOfficers();

    // Poll live every 3s to reflect availability updates from Officers
    const interval = setInterval(() => {
      loadStats(true);
      loadOfficers(true);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  async function handleCreateOfficer(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.officer_id || !formData.officer_name || !formData.email) {
      push("Please fill in Officer ID, Name, and Email", "error");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        push(data.error || "Could not create officer", "error");
      } else {
        push(`Officer ${formData.officer_name} created successfully`, "success");
        setShowAddModal(false);
        setFormData({
          officer_id: "",
          officer_name: "",
          email: "",
          agency: "Department of Economic Development",
          department: "Licensing",
          designation: "Senior Officer",
        });
        loadOfficers();
      }
    } catch {
      push("Network error while creating officer", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteOfficer(name: string, officerName: string) {
    if (!confirm(`Are you sure you want to delete officer ${officerName}?`)) return;
    setDeleting(name);
    try {
      const res = await fetch(`/api/admin/officers?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        push(data.error || "Could not delete officer", "error");
      } else {
        push(`Officer ${officerName} deleted`, "success");
        loadOfficers();
      }
    } catch {
      push("Network error while deleting officer", "error");
    } finally {
      setDeleting(null);
    }
  }

  const cards = [
    { label: "Submitted", value: stats?.counts.submitted, color: "text-slate-900" },
    { label: "Under review", value: stats?.counts.under_review, color: "text-amber-600" },
    { label: "Approved", value: stats?.counts.approved, color: "text-emerald-600" },
    { label: "Rejected", value: stats?.counts.rejected, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("admin.overview")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("admin.subtitle")}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
          + Add Officer
        </Button>
      </div>

      {statsError && <ErrorBanner message={statsError} onRetry={loadStats} />}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5 border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`mt-2 text-3xl font-bold ${c.color === "text-slate-900" ? "text-blue-900" : c.color}`}>
              {statsLoading ? <span className="inline-block h-8 w-12 animate-pulse rounded bg-slate-200" /> : c.value ?? 0}
            </p>
          </Card>
        ))}
      </div>

      {/* Officer Roster Card */}
      <Card>
        <CardHeader title="Officer Roster" subtitle="Real-time availability and assigned workload across agencies" />
        <div className="divide-y divide-slate-100">
          {officersLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : officersError ? (
            <div className="p-5">
              <ErrorBanner message={officersError} onRetry={loadOfficers} />
            </div>
          ) : officers && officers.length > 0 ? (
            officers.map((o) => {
              const statusColor =
                o.availability === "Available"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : o.availability === "Busy"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200";

              return (
                <div key={o.name} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{o.officer_name}</p>
                      <span className="text-xs font-mono text-slate-400">({o.officer_id || o.name})</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {o.agency || "DED"} · {o.department || "Licensing"} · {o.designation || "Officer"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{o.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border ${statusColor}`}>
                      ● {o.availability || "Available"}
                    </span>
                    <button
                      onClick={() => handleDeleteOfficer(o.name, o.officer_name)}
                      disabled={deleting === o.name}
                      className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                      title="Delete Officer"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">No officers provisioned yet. Click "+ Add Officer" to create one.</div>
          )}
        </div>
      </Card>


      {/* Modal: Add Officer */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Add New Officer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateOfficer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Officer ID (Staff ID)</label>
                <input
                  required
                  value={formData.officer_id}
                  onChange={(e) => setFormData({ ...formData, officer_id: e.target.value })}
                  placeholder="e.g. OFC-2001"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  required
                  value={formData.officer_name}
                  onChange={(e) => setFormData({ ...formData, officer_name: e.target.value })}
                  placeholder="e.g. Tariq Al Mansoori"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. tariq@ded.gov.ae"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Agency</label>
                <input
                  value={formData.agency}
                  onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Department</label>
                <input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Designation</label>
                <input
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" loading={creating} className="bg-blue-600 hover:bg-blue-700">Create Officer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
