"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { useLanguage } from "@/components/ui/LanguageContext";

type Profile = { name: string; full_name: string; agency?: string } | null;
type Availability = "Available" | "Busy" | "Offline";

export function OfficerHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { push } = useToast();
  const { lang, setLang, t } = useLanguage();

  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [availability, setAvailability] = useState<Availability>("Available");
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/officer/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.authenticated) {
          setProfile(d.profile);
          // Load officer availability
          fetch("/api/officer/availability")
            .then((r) => r.json())
            .then((avData) => {
              if (avData.ok && avData.availability) {
                setAvailability(avData.availability);
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => { })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleAvailabilityChange(newStatus: Availability) {
    setUpdatingAvailability(true);
    setAvailability(newStatus);
    try {
      const res = await fetch("/api/officer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        push(data.error || "Failed to update availability", "error");
      } else {
        push(`Availability set to ${newStatus}`, "success");
      }
    } catch {
      push("Network error updating availability", "error");
    } finally {
      setUpdatingAvailability(false);
    }
  }

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/officer/queue");
        const data = await res.json();
        if (!cancelled && data.ok && data.data) {
          const humanReviewItems = data.data.filter((item: any) => item.status === "Human Review");
          if (humanReviewItems.length > 0) {
            const newNotifs = humanReviewItems.map((item: any) => ({
              id: item.name,
              title: "Manual Review Required",
              message: `Case ${item.name} (${item.permit_type}) requires human review.`,
              time: "Just now",
              unread: true,
              link: "/officer/dashboard"
            }));
            if (notifications.length !== newNotifs.length || (newNotifs[0] && newNotifs[0].id !== notifications[0]?.id)) {
              setNotifications(newNotifs);
              if (newNotifs.length > notifications.length && newNotifs[0]) {
                push(`New Human Review case: ${newNotifs[0].id}`, "info");
              }
            }
          } else if (notifications.length > 0) {
            setNotifications([]);
          }
        }
      } catch (e) { }
    };
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [profile, notifications, push]);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/officer/auth/logout", { method: "POST" });
      push(t("nav.signout"), "success");
      router.push("/officer/login");
    } catch {
      push("Could not sign out", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const isLogin = pathname === "/officer/login";

  return (
    <header className="sticky top-0 z-30 border-b border-blue-200 bg-white/90 backdrop-blur shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/officer/dashboard" className="flex items-center gap-2">
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

          {!isLogin && <NotificationBell notifications={notifications} />}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {loading ? (
            <Spinner size={16} className="text-slate-400" />
          ) : profile ? (
            <div className="flex items-center gap-3">
              {/* Officer name & ID */}
              <span className="hidden text-slate-500 sm:inline-flex items-center gap-1.5 font-medium">
                <span className="text-slate-700">{profile.full_name}</span>
                <span className="text-xs text-slate-400">({profile.name})</span>
              </span>

              {/* Availability Dropdown */}
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
                <span className={`h-2 w-2 rounded-full ${availability === "Available" ? "bg-emerald-500" : availability === "Busy" ? "bg-amber-500" : "bg-slate-400"}`} />
                <select
                  value={availability}
                  disabled={updatingAvailability}
                  onChange={(e) => handleAvailabilityChange(e.target.value as Availability)}
                  className="bg-transparent font-medium text-slate-700 outline-none cursor-pointer"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>

              <button
                onClick={logout}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-60 shadow-sm"
              >
                {loggingOut && <Spinner size={14} />}
                {t("nav.signout")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
