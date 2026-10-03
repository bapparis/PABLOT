"use client";

import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";

type Overview = {
  users: number;
  active_tasks: number;
  pending_withdrawals: number;
  pending_pp: number;
  pending_gross_usd: number;
  pending_net_usd: number;
};

export default function AdminDashboardClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/overview", {
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.href = "/admin";
          return;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load overview.");
        }

        setData(result);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load overview."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <AdminShell>
      <main className="relative overflow-hidden px-4 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(89,217,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(89,217,255,.7) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />

        <div className="relative mx-auto w-full max-w-3xl">
          <header className="mb-6 pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Overview
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Platform activity and administrative controls.
            </p>
          </header>

          {error && (
            <div className="mb-5 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300">
              {error}
            </div>
          )}

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                Users
              </p>
              <p className="mt-2 text-2xl font-black">
                {loading ? "—" : data?.users.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-white/[0.025] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                Active Tasks
              </p>
              <p className="mt-2 text-2xl font-black">
                {loading ? "—" : data?.active_tasks.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[22px] border border-[#59D9FF]/10 bg-[#59D9FF]/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#59D9FF]">
                Pending Withdrawals
              </p>
              <p className="mt-2 text-2xl font-black">
                {loading ? "—" : data?.pending_withdrawals.toLocaleString()}
              </p>
            </div>

            <div className="rounded-[22px] border border-[#59D9FF]/10 bg-[#59D9FF]/[0.035] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#59D9FF]">
                Pending Payout
              </p>
              <p className="mt-2 text-2xl font-black">
                {loading
                  ? "—"
                  : `$${data?.pending_net_usd.toFixed(2)}`}
              </p>
            </div>
          </section>

          <section className="mt-5 space-y-3">
            <a
              href="/admin/withdrawals"
              className="block rounded-[24px] border border-[#59D9FF]/15 bg-[#59D9FF]/[0.045] p-5 transition active:scale-[0.99] hover:bg-[#59D9FF]/[0.07]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#59D9FF]">
                    💸 Withdrawals
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Review payout requests
                  </h2>
                  <p className="mt-1 text-sm text-white/35">
                    Approve or reject pending withdrawals.
                  </p>
                </div>

                <span className="text-xl text-[#59D9FF]">→</span>
              </div>
            </a>

            <a
              href="/admin/tasks"
              className="block rounded-[24px] border border-white/10 bg-white/[0.025] p-5 transition active:scale-[0.99] hover:bg-white/[0.045]"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                    📋 Tasks
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    Manage earning tasks
                  </h2>
                  <p className="mt-1 text-sm text-white/35">
                    Create, edit and control task availability.
                  </p>
                </div>

                <span className="text-xl text-white/40">→</span>
              </div>
            </a>
          </section>
        </div>
      </main>
    </AdminShell>
  );
}
