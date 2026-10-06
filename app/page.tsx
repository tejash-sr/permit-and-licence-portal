import Link from "next/link";

const PORTALS = [
  {
    href: "/citizen/login",
    title: "Citizen Portal",
    desc: "Apply for permits and licences, upload documents, and track your applications.",
    icon: "👤",
  },
  {
    href: "/officer/login",
    title: "Officer Portal",
    desc: "Review submitted applications, verify AI findings, and approve or reject cases.",
    icon: "🗂️",
  },
  {
    href: "/admin/login",
    title: "Admin Portal",
    desc: "Monitor platform-wide status, SLA breaches, and officer workload.",
    icon: "⚙️",
  },
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Moheet Operations</p>
        <h1 className="text-3xl font-semibold text-slate-900">Permit &amp; Licence Platform</h1>
        <p className="mt-2 text-sm text-slate-500">Choose your portal to sign in.</p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
        {PORTALS.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <span className="mb-4 text-3xl">{p.icon}</span>
            <span className="text-base font-semibold text-slate-900">{p.title}</span>
            <span className="mt-1.5 text-sm text-slate-500">{p.desc}</span>
            <span className="mt-4 text-sm font-medium text-slate-900 group-hover:underline">Sign in →</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
