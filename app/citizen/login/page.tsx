"use client";
import { useState, useRef, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { useToast } from "@/components/ui/Toast";

type Step = "identify" | "otp";

function CitizenLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { push } = useToast();

  const [step, setStep] = useState<Step>("identify");
  const [emiratesId, setEmiratesId] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedDest, setMaskedDest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  async function requestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/citizen/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emirates_id: emiratesId.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }
      setMaskedDest(data.masked_destination);
      setStep("otp");
      push(`Code sent to ${data.masked_destination}`, "success");
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
      const res = await fetch("/api/citizen/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emirates_id: emiratesId.trim(), otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Invalid code");
        return;
      }
      push(`Welcome, ${data.full_name}`, "success");
      router.push(params.get("next") || "/citizen/dashboard");
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
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
        <h2 className="text-center text-lg font-medium text-slate-700 mt-1 mb-6">Citizen Portal</h2>
        <p className="mt-1 text-sm text-center text-slate-500 mb-6">
          {step === "identify"
            ? "Verify your identity against the government ID registry."
            : `Enter the code sent to ${maskedDest}.`}
        </p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {step === "identify" ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Emirates ID</label>
              <input
                required
                value={emiratesId}
                onChange={(e) => setEmiratesId(e.target.value)}
                placeholder="784-1990-1234567-1"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Phone number</label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971 5X XXX XXXX"
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <Button type="submit" loading={loading} fullWidth className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Verifying identity…" : "Continue"}
            </Button>
            <p className="text-center text-xs text-slate-400">
              Demo records: 784-1990-1234567-10 (Tejash) · 784-1995-7654321-20 (Fatima)
            </p>
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

export default function CitizenLoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading...</div>}>
      <CitizenLoginForm />
    </Suspense>
  );
}
