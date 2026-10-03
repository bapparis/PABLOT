"use client";

import { ReactNode, useState } from "react";

const navigation = [
  { href: "/admin/dashboard", label: "Overview", icon: "⌂" },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: "↗" },
  { href: "/admin/tasks", label: "Tasks", icon: "☷" },
  { href: "/admin/users", label: "Users", icon: "♙" },
  { href: "/admin/analytics", label: "Analytics", icon: "◫" },
  { href: "/admin/staff", label: "Staff", icon: "♙" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

export default function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.href = "/admin";
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-white">
      <button
        type="button"
        aria-label="Open admin navigation"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0d141e]/90 text-lg backdrop-blur"
      >
        ☰
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/60"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/10 bg-[#080e17] p-5 transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>
            <h2 className="mt-2 text-xl font-black">
              Command Center
            </h2>
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/50"
          >
            ×
          </button>
        </div>

        <nav className="mt-8 space-y-2">
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex min-h-12 items-center gap-3 rounded-2xl border border-transparent px-4 text-sm font-bold text-white/55 transition hover:border-[#59D9FF]/10 hover:bg-[#59D9FF]/5 hover:text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-[#59D9FF]">
                {item.icon}
              </span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={logout}
            className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-sm font-bold text-red-300 transition hover:bg-red-400/5"
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </aside>

      <div className="min-h-screen pt-16">
        {children}
      </div>
    </div>
  );
}
