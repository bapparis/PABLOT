"use client";

import { FormEvent, useState } from "react";

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/staff/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Unable to sign in.");
        return;
      }

      window.location.href = "/admin/dashboard";
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#061018] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-md items-center">
        <section className="w-full rounded-3xl border border-white/10 bg-[#0b111b] p-6 shadow-2xl">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>
            <h1 className="mt-3 text-3xl font-black">
              Staff Sign In
            </h1>
            <p className="mt-2 text-sm text-white/50">
              Sign in with your assigned staff credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061018] px-4 py-3 text-white outline-none focus:border-[#59D9FF]"
                placeholder="staff@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-white/70"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#061018] px-4 py-3 text-white outline-none focus:border-[#59D9FF]"
                placeholder="Your staff password"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-semibold text-red-200"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#59D9FF] px-4 py-3 font-black text-[#061018] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
