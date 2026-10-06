"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/ui/LanguageContext";

type Profile = { full_name: string } | null;

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();
  const { lang, setLang, t } = useLanguage();

  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/auth/me")
      .then((r) => r.json())
      .then((d) => !cancelled && setProfile(d.authenticated ? d.profile : null))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      push(t("nav.signout"), "success");
      router.push("/admin/login");
    } catch {
      push("Could not sign out", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const isLogin = pathname === "/admin/login";

  return (
    <header className="sticky top-0 z-30 border-b border-blue-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <img src="/grootan-logo.webp" alt="" className="h-9 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">Grootan</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            {lang === "en" ? "عربي" : "English"}
          </button>

          {loading ? (
            <Spinner size={16} className="text-slate-400" />
          ) : profile ? (
            <>
              <span className="hidden text-slate-700 font-medium sm:inline">{profile.full_name}</span>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-60 shadow-sm"
              >
                {loggingOut && <Spinner size={14} />}
                {t("nav.signout")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
