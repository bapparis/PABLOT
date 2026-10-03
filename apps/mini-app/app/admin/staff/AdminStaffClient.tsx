"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminShell from "@/app/admin/AdminShell";

type StaffRole = "owner" | "admin" | "moderator" | "support";
type StaffStatus = "active" | "disabled";

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: Record<string, boolean>;
  created_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

const roles: Array<{
  value: Exclude<StaffRole, "owner">;
  label: string;
  description: string;
}> = [
  {
    value: "admin",
    label: "Admin",
    description: "Withdrawals, tasks, users, analytics and settings.",
  },
  {
    value: "moderator",
    label: "Moderator",
    description: "Users, tasks and withdrawal review.",
  },
  {
    value: "support",
    label: "Support",
    description: "User support and account information.",
  },
];

function roleLabel(role: StaffRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatDate(value: string | null) {
  if (!value) return "Never";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminStaffClient() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<Exclude<StaffRole, "owner">>("admin");

  async function loadStaff() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/staff", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to load staff.");
        return;
      }

      setStaff(data.staff ?? []);
    } catch {
      setMessage("Unable to connect to the staff service.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStaff();
  }, []);

  async function createStaff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 10) {
      setMessage("Password must be at least 10 characters.");
      return;
    }

    setCreating(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Failed to create staff account.");
        return;
      }

      setMessage("Staff account created successfully.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("admin");
      setShowForm(false);

      await loadStaff();
    } catch {
      setMessage("Unable to create staff account.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <AdminShell>
      <main className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>

            <h1 className="mt-2 text-2xl font-black tracking-tight">
              Staff
            </h1>

            <p className="mt-1 max-w-xl text-xs text-white/40">
              Manage administrator access and operational roles.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((value) => !value);
              setMessage("");
            }}
            className="rounded-xl border border-[#59D9FF]/20 bg-[#59D9FF]/10 px-4 py-2.5 text-xs font-black text-[#59D9FF] transition hover:bg-[#59D9FF]/15"
          >
            {showForm ? "Close" : "+ Add Staff"}
          </button>
        </div>

        {message && (
          <div
            className={`mt-5 rounded-xl border px-4 py-3 text-xs font-bold ${
              message.includes("successfully")
                ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
                : "border-red-400/20 bg-red-400/5 text-red-300"
            }`}
          >
            {message}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={createStaff}
            className="mt-5 rounded-2xl border border-white/10 bg-[#0d141e] p-5"
          >
            <div className="mb-5">
              <p className="text-sm font-black">Add staff member</p>
              <p className="mt-1 text-[10px] text-white/35">
                Create an individual login. Passwords are securely hashed.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Name
                </span>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080e17] px-3 text-sm text-white outline-none focus:border-[#59D9FF]/40"
                  placeholder="Staff name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080e17] px-3 text-sm text-white outline-none focus:border-[#59D9FF]/40"
                  placeholder="staff@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Temporary password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={10}
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080e17] px-3 text-sm text-white outline-none focus:border-[#59D9FF]/40"
                  placeholder="Minimum 10 characters"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Role
                </span>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(
                      event.target.value as Exclude<
                        StaffRole,
                        "owner"
                      >
                    )
                  }
                  className="h-11 w-full rounded-xl border border-white/10 bg-[#080e17] px-3 text-sm text-white outline-none focus:border-[#59D9FF]/40"
                >
                  {roles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
              <p className="text-xs font-bold text-white/70">
                {roles.find((item) => item.value === role)?.label}
              </p>

              <p className="mt-1 text-[10px] text-white/35">
                {roles.find((item) => item.value === role)?.description}
              </p>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="mt-5 min-h-11 rounded-xl bg-[#59D9FF] px-5 text-xs font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Staff Account"}
            </button>
          </form>
        )}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
                Team
              </p>

              <p className="mt-1 text-xs font-bold text-white/60">
                {staff.length} staff account{staff.length === 1 ? "" : "s"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadStaff()}
              disabled={loading}
              className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black text-white/50 transition hover:bg-white/[0.03] disabled:opacity-30"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0d141e] px-5 py-8 text-center text-xs text-white/35">
              Loading staff...
            </div>
          ) : staff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d141e] px-5 py-10 text-center">
              <p className="text-sm font-black">No staff accounts yet</p>
              <p className="mt-1 text-[10px] text-white/35">
                Add your first staff member above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {staff.map((member) => (
                <article
                  key={member.id}
                  className="rounded-2xl border border-white/10 bg-[#0d141e] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-black">
                          {member.name}
                        </h2>

                        <span className="rounded-full border border-[#59D9FF]/15 bg-[#59D9FF]/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#59D9FF]">
                          {roleLabel(member.role)}
                        </span>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                            member.status === "active"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-red-400/10 text-red-300"
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-xs text-white/45">
                        {member.email}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-white/25">
                        Last login
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-white/50">
                        {formatDate(member.last_login_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {Object.entries(member.permissions)
                      .filter(([, enabled]) => enabled)
                      .slice(0, 4)
                      .map(([permission]) => (
                        <div
                          key={permission}
                          className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2"
                        >
                          <p className="truncate text-[9px] font-bold text-white/45">
                            {permission
                              .replaceAll("_", " ")
                              .replace(/\b\w/g, (letter) =>
                                letter.toUpperCase()
                              )}
                          </p>
                        </div>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </AdminShell>
  );
}
