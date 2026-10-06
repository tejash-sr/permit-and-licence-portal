"use client";
import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type Toast = { id: number; message: string; kind: "success" | "error" | "info" };
type ToastContextValue = { push: (message: string, kind?: Toast["kind"]) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<Toast["kind"], string> = { success: "✓", error: "!", info: "i" };
const STYLES: Record<Toast["kind"], string> = {
  success: "bg-emerald-600",
  error: "bg-rose-600",
  info: "bg-slate-800",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${STYLES[t.kind]}`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {ICONS[t.kind]}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
