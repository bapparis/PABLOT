"use client";

import { FormEvent, useState } from "react";

export default function AdminSetupPage() {
  const [bootstrapPassword, setBootstrapPassword] = useState("");
  const [displayName, setDisplayName] = useState("Abdool Paris");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    if (password.length < 10) {
      setError("Your new password must be at least 10 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bootstrapPassword,
          displayName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to configure owner account.");
        return;
      }

      setSuccess(
        "Owner account created successfully. Redirecting to login..."
      );

      setBootstrapPassword("");
      setPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        window.location.href = "/admin";
      }, 1500);
    } catch {
      setError("Unable to connect to the admin server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#080d14] px-4 py-8 text-white">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center justify-center">
        <div className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-[#59D9FF]/5 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-10 h-52 w-52 rounded-full bg-[#3388FF]/5 blur-3xl" />

        <section className="relative w-full">
          <div className="mb-6 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#59D9FF]">
              PABLOT CONTROL
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Owner Setup
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-white/40">
              Create your permanent owner credentials for the command center.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.025] p-5 shadow-[0_25px_70px_rgba(0,0,0,.35)]">
            <form onSubmit={handleSetup} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Current Generated Password
                </span>

                <input
                  type="password"
                  value={bootstrapPassword}
                  onChange={(event) =>
                    setBootstrapPassword(event.target.value)
                  }
                  placeholder="Your current ADMIN_PASSWORD"
                  autoComplete="current-password"
                  required
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Owner Name
                </span>

                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Abdool Paris"
                  autoComplete="name"
                  required
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Owner Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="your@email.com"
                  autoComplete="email"
                  required
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  New Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 10 characters"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.12em] text-white/40">
                  Confirm New Password
                </span>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="min-h-12 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-base text-white outline-none transition placeholder:text-white/20 focus:border-[#59D9FF]/40"
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

              {success && (
                <div
                  role="status"
                  className="rounded-2xl border border-[#59D9FF]/15 bg-[#59D9FF]/10 px-4 py-3 text-sm font-semibold text-[#59D9FF]"
                >
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-2xl bg-[#59D9FF] px-4 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creating owner account..." : "Create Owner Account"}
              </button>
            </form>

            <p className="mt-5 text-center text-[10px] font-bold leading-5 text-white/25">
              The generated password is used only for initial setup. Your new
              password will be stored as a secure hash.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
