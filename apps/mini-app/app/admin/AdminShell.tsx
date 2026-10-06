"use client";

import { ReactNode, useEffect, useState } from "react";

type AdminIdentity = {
  type: "owner" | "staff";
  role: "owner" | "admin" | "moderator" | "support";
  permissions: Record<string, boolean>;
};

const navigation = [
  {
    href: "/admin/dashboard",
    label: "Overview",
    icon: "⌂",
    permission: "view_overview",
  },
  {
    href: "/admin/withdrawals",
    label: "Withdrawals",
    icon: "↗",
    permission: "manage_withdrawals",
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    icon: "☷",
    permission: "manage_tasks",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: "♙",
    permission: "manage_users",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: "◫",
    permission: "view_analytics",
  },
  {
    href: "/admin/staff",
    label: "Staff",
    icon: "♙",
    ownerOnly: true,
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "⚙",
    permission: "manage_settings",
  },
  {
    href: "/admin/profile",
    label: "Profile",
    icon: "●",
    ownerOnly: true,
  },
];

export default function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [identity, setIdentity] = useState<AdminIdentity | null>(null);

  useEffect(() => {
    let active = true;

    async function loadIdentity() {
      try {
        const response = await fetch("/api/admin/me", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (active) {
          setIdentity(data);
        }
      } catch {
        // Keep the drawer unavailable until identity is loaded.
      }
    }

    loadIdentity();

    return () => {
      active = false;
    };
  }, []);

  const visibleNavigation = navigation.filter((item) => {
    if (!identity) {
      return false;
    }

    if (item.ownerOnly) {
      return identity.type === "owner";
    }

    return item.permission
      ? identity.permissions[item.permission] === true
      : true;
  });

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.href = identity?.type === "staff" ? "/staff" : "/admin";
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
            <h2 className="mt-2 text-xl font-black">Command Center</h2>
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
          {visibleNavigation.map((item) => (
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
