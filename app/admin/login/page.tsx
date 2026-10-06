"use client";
import { useState, useRef, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/Toast";

type Step = "identify" | "otp";

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();

  const [step, setStep] = useState<Step>("identify");
  const [staffId, setStaffId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setStep("otp");
      push("Verification code sent", "success");
      setTimeout(() => otpInputRef.current?.focus(), 50);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staff_id: staffId.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }
      push(`Welcome, ${data.full_name}`, "success");
      router.push(params.get("next") || "/admin/dashboard");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md animate-fade-in p-8">
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-lg font-medium text-slate-700 mt-1 mb-6">Admin Portal</h2>
        <p className="mt-1 text-sm text-center text-slate-500 mb-6">
          {step === "identify" ? "Verify your ID against the platform admin registry." : "Enter your verification code."}
        </p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {step === "identify" ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Admin ID</label>
              <input
                required
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="ADM-01"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <Button type="submit" loading={loading} fullWidth className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Verifying…" : "Continue"}
            </Button>
            <p className="text-center text-xs text-slate-400">Demo ID: ADM-01</p>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">One-time code</label>
              <input
                ref={otpInputRef}
                required
                inputMode="numeric"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-center text-lg tracking-[0.5em] outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
              <p className="mt-1.5 text-xs text-slate-400">Demo code is always 1234.</p>
            </div>
            <Button type="submit" loading={loading} fullWidth className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Signing in…" : "Verify & sign in"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep("identify");
                setOtp("");
                setError(null);
              }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
            >
              ← Use a different ID
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
