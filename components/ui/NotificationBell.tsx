"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  link?: string;
};

export function NotificationBell({ notifications = [] }: { notifications?: Notification[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      >
        <span className="sr-only">View notifications</span>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white">
            <span className="sr-only">{unreadCount} unread</span>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg focus:outline-none z-50 animate-fade-in overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                You're all caught up.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((n) => {
                  const content = (
                    <div className={`p-4 hover:bg-slate-50 transition-colors ${n.unread ? "bg-blue-50/30" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${n.unread ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] font-medium text-slate-400 whitespace-nowrap">{n.time}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{n.message}</p>
                    </div>
                  );

                  return n.link ? (
                    <Link key={n.id} href={n.link} className="block" onClick={() => setOpen(false)}>
                      {content}
                    </Link>
                  ) : (
                    <div key={n.id}>{content}</div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
