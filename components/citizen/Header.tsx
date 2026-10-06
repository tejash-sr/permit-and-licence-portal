"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLanguage } from "@/components/ui/LanguageContext";

type Profile = { full_name: string; email: string } | null;

export function CitizenHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();
  const { lang, setLang, t } = useLanguage();

  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/citizen/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setProfile(d.authenticated ? d.profile : null);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/citizen/applications");
        const data = await res.json();
        if (!cancelled && data.ok && data.data) {
          const terminalApps = data.data.filter((item: any) => ["Approved", "Rejected"].includes(item.status));
          if (terminalApps.length > 0) {
            const newNotifs = terminalApps.slice(0, 3).map((item: any) => ({
              id: `${item.name}-${item.status}`,
              title: `Application ${item.status}`,
              message: `Your application ${item.name} (${item.permit_type}) was ${item.status.toLowerCase()}.`,
              time: "Recent",
              unread: true,
              link: `/citizen/applications/${item.name}`
            }));
            if (notifications.length === 0 || (newNotifs[0] && newNotifs[0].id !== notifications[0]?.id)) {
              setNotifications(newNotifs);
            }
          }
        }
      } catch (e) {}
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile, notifications]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/citizen/auth/logout", { method: "POST" });
      push(t("nav.signout"), "success");
      router.push("/citizen/login");
    } catch {
      push("Could not sign out", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const isLogin = pathname === "/citizen/login";

  return (
    <header className="sticky top-0 z-30 border-b border-blue-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/citizen/dashboard" className="flex items-center gap-2">
          <img src="/grootan-logo.webp" alt="" className="h-9 w-auto" />
          <span className="text-lg font-semibold tracking-tight text-slate-900">Grootan</span>
        </Link>
        {!isLogin && (
          <nav className="hidden items-center gap-6 text-sm text-slate-600 sm:flex">
            <Link 
              href="/citizen/apply" 
              className={pathname.startsWith("/citizen/apply") ? "font-medium text-blue-700" : "hover:text-blue-600 transition-colors"}
            >
              {t("nav.apply")}
            </Link>
            <Link 
              href="/citizen/applications" 
              className={pathname.startsWith("/citizen/applications") ? "font-medium text-blue-700" : "hover:text-blue-600 transition-colors"}
            >
              {t("nav.applications")}
            </Link>
          </nav>
        )}
        <div className="flex items-center gap-3 text-sm">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            {lang === "en" ? "عربي" : "English"}
          </button>

          {!isLogin && <NotificationBell notifications={notifications} />}
          
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {loading ? (
            <Spinner size={16} className="text-slate-400" />
          ) : profile ? (
            <button
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-60 shadow-sm"
            >
              {loggingOut && <Spinner size={14} />}
              {t("nav.signout")}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
