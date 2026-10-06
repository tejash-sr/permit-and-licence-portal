"use client";
import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/ui/LanguageContext";

type RequiredDoc = {
  document_name: string;
  doc_type_code: string;
  is_mandatory: 0 | 1;
  applicable_stage?: string;
  applicable_agency?: string;
};

type PermitType = {
  name: string;
  permit_type_name: string;
  application_type?: "Permit" | "Licence" | string;
  renewal_behaviour: string;
  requires_location: 0 | 1;
  requires_trade_licence: 0 | 1;
  validity_days: number;
  ai_validation_hint?: string;
  required_documents: RequiredDoc[];
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CitizenApplyPage() {
  const router = useRouter();
  const { push } = useToast();
  const { t, lang } = useLanguage();

  const [types, setTypes] = useState<PermitType[] | null>(null);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);

  const [selected, setSelected] = useState<PermitType | null>(null);
  const [files, setFiles] = useState<Record<string, { name: string; base64: string; sizeKB: number }>>({});
  const [location, setLocation] = useState("");
  const [tradeLicence, setTradeLicence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [successData, setSuccessData] = useState<{ permitId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"All" | "Permit" | "Licence">("All");

  function loadTypes() {
    setTypesLoading(true);
    setTypesError(null);
    fetch("/api/citizen/permit-types")
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          router.push("/citizen/login");
          throw new Error("Not signed in");
        }
        return r.json();
      })
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setTypes(d.data);
      })
      .catch((e) => setTypesError(e.message || "Could not load permit types."))
      .finally(() => setTypesLoading(false));
  }

  useEffect(loadTypes, []);

  async function handleFile(code: string, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      push(`Only PDF files are allowed for ${code}`, "error");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      push(`${file.name} exceeds 2MB limit`, "error");
      e.target.value = "";
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFiles((f) => ({ ...f, [code]: { name: file.name, base64, sizeKB: Math.round(file.size / 1024) } }));
    } catch {
      push(`Could not read ${file.name}`, "error");
    }
  }

  async function submit() {
    if (!selected) return;
    const missing = selected.required_documents.filter((d) => d.is_mandatory && !files[d.doc_type_code]);
    if (missing.length > 0) {
      setSubmitError(`Missing required document(s): ${missing.map((m) => m.document_name).join(", ")}`);
      return;
    }
    if (selected.requires_location && !location.trim()) {
      setSubmitError("Location is required.");
      return;
    }
    if (selected.requires_trade_licence && !tradeLicence.trim()) {
      setSubmitError("Trade Licence number is required.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const filePayload: Record<string, string> = {};
      Object.entries(files).forEach(([code, f]) => (filePayload[code] = f.base64));

      const res = await fetch("/api/citizen/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permit_type: selected.name,
          location: selected.requires_location ? location.trim() : undefined,
          trade_licence_number: selected.requires_trade_licence ? tradeLicence.trim() : undefined,
          files: filePayload,
          language_preference: lang === "ar" ? "Arabic" : "English"
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setSubmitError(data.error ?? "Submission failed. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSuccessData({ permitId: data.permitId });
    } catch {
      setSubmitError("Network error while submitting. Try again.");
      setSubmitting(false);
    }
  }

  if (submitting) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-fade-in">
        <Spinner size={48} className="text-blue-600 mb-6" />
        <h2 className="text-xl font-semibold text-slate-900">{t("apply.submit")}</h2>
        <p className="mt-2 text-slate-500 max-w-sm text-center">
          {t("apply.submitting_overlay")}
        </p>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="mx-auto max-w-lg space-y-6 animate-fade-in py-12">
        <Card className="p-8 text-center border-emerald-200 bg-emerald-50/30">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("apply.success_title")}</h1>
          <p className="mt-2 text-slate-600">
            {successData.permitId}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row justify-center">
            <Button onClick={() => router.push(`/citizen/applications/${successData.permitId}`)}>
              {t("apply.view_status")}
            </Button>
            <Button variant="secondary" onClick={() => { setSuccessData(null); setSelected(null); setFiles({}); setLocation(""); setTradeLicence(""); }}>
              {t("citizen.new_app")}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
        <button onClick={() => setSelected(null)} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          {t("apply.back")}
        </button>

        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-900">{selected.permit_type_name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Validity: {selected.validity_days} days · {selected.renewal_behaviour}
          </p>
        </div>

        {submitError && <ErrorBanner message={submitError} />}

        {(selected.requires_location === 1 || selected.requires_trade_licence === 1) && (
          <Card className="p-5 space-y-4">
            {selected.requires_location === 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("apply.location")}</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t("apply.location_placeholder")}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {selected.requires_trade_licence === 1 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("apply.trade_licence")}</label>
                <input
                  value={tradeLicence}
                  onChange={(e) => setTradeLicence(e.target.value)}
                  placeholder={t("apply.trade_licence_placeholder")}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}
          </Card>
        )}

        <Card>
          <CardHeader title={t("apply.req_docs")} subtitle={t("apply.pdf_only")} />
          <div className="divide-y divide-slate-100">
            {selected.required_documents.map((doc) => {
              const uploaded = files[doc.doc_type_code];
              return (
                <div key={doc.doc_type_code} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                      {doc.document_name}
                      {doc.is_mandatory === 1 ? (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">Required</span>
                      ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">Optional</span>
                      )}
                      {doc.applicable_agency && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">{doc.applicable_agency}</span>
                      )}
                    </p>
                    {uploaded ? (
                      <p className="mt-1 truncate text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        {uploaded.name} ({uploaded.sizeKB} KB)
                      </p>
                    ) : selected.ai_validation_hint ? (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1 flex items-center gap-1">
                        <span className="text-blue-500">✨ AI check:</span> {selected.ai_validation_hint}
                      </p>
                    ) : null}
                  </div>
                  <label className="shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                    {uploaded ? t("apply.replace") : t("apply.upload")}
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFile(doc.doc_type_code, e)} />
                  </label>
                </div>
              );
            })}
          </div>
        </Card>

        <Button onClick={submit} className="bg-blue-600 hover:bg-blue-700" fullWidth>
          {t("apply.submit")}
        </Button>
      </div>
    );
  }


  const filteredTypes = types?.filter((item) => {
    if (activeTab === "All") return true;
    const itemType = item.application_type || (item.permit_type_name?.toLowerCase().includes("licence") ? "Licence" : "Permit");
    return itemType.toLowerCase() === activeTab.toLowerCase();
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{t("apply.title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t("apply.select_type")}</p>
        </div>

        {/* Filter Tabs: All, Permits, Licences */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-medium self-start sm:self-auto">
          {(["All", "Permit", "Licence"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-3 py-1.5 transition-all ${
                activeTab === tab
                  ? "bg-white font-bold text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab === "All" ? (lang === "ar" ? "الكل" : "All") : tab === "Permit" ? (lang === "ar" ? "التصاريح" : "Permits") : (lang === "ar" ? "التراخيص" : "Licences")}
            </button>
          ))}
        </div>
      </div>

      {typesLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : typesError ? (
        <ErrorBanner message={typesError} onRetry={loadTypes} />
      ) : filteredTypes && filteredTypes.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredTypes.map((item) => {
            const isLicence = (item.application_type || item.permit_type_name).toLowerCase().includes("licence");
            const tagLabel = isLicence ? (lang === "ar" ? "رخصة" : "Licence") : (lang === "ar" ? "تصريح" : "Permit");
            const tagStyle = isLicence
              ? "bg-purple-50 text-purple-700 ring-purple-600/20"
              : "bg-blue-50 text-blue-700 ring-blue-600/20";

            return (
              <button
                key={item.name}
                onClick={() => setSelected(item)}
                className="group relative flex flex-col items-start justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md hover:ring-1 hover:ring-blue-100"
              >
                <div className="w-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {item.permit_type_name}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tagStyle}`}>
                      {isLicence ? "📜" : "🏷️"} {tagLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {item.required_documents.length} doc{item.required_documents.length === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item.validity_days} days
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-400">
          No {activeTab.toLowerCase()} types are currently available.
        </div>
      )}
    </div>
  );
}
