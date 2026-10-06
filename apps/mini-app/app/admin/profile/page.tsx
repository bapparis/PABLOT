"use client";

import { useEffect, useState } from "react";

type OwnerProfile = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/admin/profile", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error || "Unable to load profile."
          );
        }

        if (active) {
          setProfile(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load profile."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-10 sm:px-8">
      <div className="mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
          Account
        </p>

        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
          Admin Profile
        </h1>

        <p className="mt-2 max-w-xl text-sm text-white/45">
          Manage your PABLOT owner account and authentication details.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-[#0d141e] p-5 text-sm text-white/50">
          Loading owner profile…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5 text-sm text-red-200">
          {error}
        </div>
      )}

      {profile && !loading && !error && (
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#59D9FF]/10 text-xl font-black text-[#59D9FF]">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-black">
                  {profile.displayName}
                </p>

                <p className="truncate text-sm text-white/45">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                  Role
                </p>
                <p className="mt-2 text-sm font-black uppercase text-[#59D9FF]">
                  {profile.role}
                </p>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                  Status
                </p>
                <p className="mt-2 text-sm font-black text-emerald-300">
                  {profile.isActive ? "ACTIVE" : "INACTIVE"}
                </p>
              </div>

              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4 sm:col-span-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
                  Account created
                </p>
                <p className="mt-2 text-sm font-bold text-white/75">
                  {new Date(profile.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Security
            </p>

            <h2 className="mt-2 text-lg font-black">
              Change password
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Update your owner password without exposing the stored
              password hash.
            </p>

            <form
              className="mt-5 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();

                const form = event.currentTarget;
                const formData = new FormData(form);

                const currentPassword = String(
                  formData.get("currentPassword") || ""
                );
                const newPassword = String(
                  formData.get("newPassword") || ""
                );
                const confirmPassword = String(
                  formData.get("confirmPassword") || ""
                );

                const submitButton =
                  form.querySelector<HTMLButtonElement>(
                    'button[type="submit"]'
                  );

                const status =
                  form.querySelector<HTMLParagraphElement>(
                    "[data-password-status]"
                  );

                if (status) {
                  status.textContent = "";
                }

                if (submitButton) {
                  submitButton.disabled = true;
                  submitButton.textContent = "Updating…";
                }

                try {
                  const response = await fetch(
                    "/api/admin/profile/password",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword,
                      }),
                    }
                  );

                  const data = await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data?.error || "Unable to change password."
                    );
                  }

                  form.reset();

                  if (status) {
                    status.className =
                      "text-xs font-bold text-emerald-300";
                    status.textContent =
                      "Password changed successfully.";
                  }
                } catch (error) {
                  if (status) {
                    status.className =
                      "text-xs font-bold text-red-300";
                    status.textContent =
                      error instanceof Error
                        ? error.message
                        : "Unable to change password.";
                  }
                } finally {
                  if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Update password";
                  }
                }
              }}
            >
              <div className="relative">
                <input
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Current password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/40"
                />

                <button
                  type="button"
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  onClick={() =>
                    setShowCurrentPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-base text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                  {showCurrentPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="relative">
                <input
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="New password"
                  minLength={10}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/40"
                />

                <button
                  type="button"
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  onClick={() =>
                    setShowNewPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-base text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                  {showNewPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="relative">
                <input
                  name="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                  minLength={10}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 pr-12 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/40"
                />

                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (value) => !value
                    )
                  }
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-base text-white/45 transition hover:bg-white/5 hover:text-white"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-[#59D9FF] px-4 py-3 text-sm font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Update password
              </button>

              <p
                data-password-status
                aria-live="polite"
                className="text-xs font-bold text-white/50"
              />
            </form>

            <p className="mt-4 text-[11px] leading-5 text-white/25">
              Minimum 10 characters. Your current password is required
              before a new password can be saved.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
