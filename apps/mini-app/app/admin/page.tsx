"use client";

import { FormEvent, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid admin password.");
        return;
      }

      window.location.href = "/admin/tasks";
    } catch {
      setError("Unable to connect to the admin server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080d14] px-4 py-8 text-white">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        {/* Spatial atmosphere */}
        <div className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-[#59D9FF]/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-10 h-52 w-52 rounded-full bg-[#3388FF]/5 blur-3xl" />

        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            maskImage: "linear-gradient(to bottom, black, transparent 90%)",
          }}
        />

        <section className="relative w-full">
          {/* Brand */}
          <div className="mb-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Command Center
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/40">
              Secure access to the PABLOT administration system.
            </p>
          </div>

          {/* Login surface */}
          <div
            className="rounded-[28px] border border-white/10 p-5"
            style={{
              background:
                "linear-gradient(145deg, rgba(89,217,255,.07), rgba(255,255,255,.025))",
              boxShadow:
                "inset 0 1px rgba(255,255,255,.06), 0 25px 70px rgba(0,0,0,.35)",
            }}
          >
            {/* System status */}
            <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  SYSTEM
                </p>
                <p className="mt-1 text-xs font-bold text-white/70">
                  Administrative access
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[#59D9FF]/15 bg-[#59D9FF]/10 px-3 py-1.5 text-[10px] font-black text-[#59D9FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#59D9FF] shadow-[0_0_12px_rgba(89,217,255,.7)]" />
                SECURE
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Admin Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter secure password"
                  autoComplete="current-password"
                  required
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40 focus:bg-black/30"
                />
              </label>

              {error && (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-300"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-2xl bg-[#59D9FF] px-4 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Authenticating..." : "Enter Command Center"}
              </button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-white/25">
              <span>🔒</span>
              <span>Private administrative environment</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
