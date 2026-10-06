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
  const [screen, setScreen] = useState<
    "profile" | "name" | "email" | "email-current" | "email-new"
  >("profile");
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailRequestId, setEmailRequestId] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailTarget, setEmailTarget] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState("");
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

  if (screen === "email-current" && profile) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            setScreen("profile");
            setEmailError("");
            setEmailCode("");
          }}
          className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            Step 1 of 2
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Verify Current Email
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Enter the 6-digit verification code sent to your current owner email.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
              Code sent to
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white/75">
              {profile.email}
            </p>
          </div>

          <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-white/35">
            Verification code
          </label>

          <input
            value={emailCode}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, "")
                .slice(0, 6);

              setEmailCode(value);
              setEmailError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-2xl font-black tracking-[0.35em] text-white outline-none placeholder:text-white/20 focus:border-[#59D9FF]/40"
          />

          {emailError && (
            <p className="mt-3 text-xs font-bold text-red-300">
              {emailError}
            </p>
          )}

          <button
            type="button"
            disabled={emailVerifying || emailCode.length !== 6}
            onClick={async () => {
              if (emailCode.length !== 6) {
                setEmailError(
                  "Enter the 6-digit verification code."
                );
                return;
              }

              setEmailVerifying(true);
              setEmailError("");

              try {
                const response = await fetch(
                  "/api/admin/profile/email/verify-current",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      requestId: emailRequestId,
                      code: emailCode,
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(
                    data?.error ||
                      "Unable to verify current email."
                  );
                }

                setEmailCode("");
                setEmailError("");
                setEmailTarget(newEmail);
                setScreen("email-new");
              } catch (err) {
                setEmailError(
                  err instanceof Error
                    ? err.message
                    : "Unable to verify current email."
                );
              } finally {
                setEmailVerifying(false);
              }
            }}
            className="mt-5 w-full rounded-xl bg-[#59D9FF] px-4 py-3 text-sm font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailVerifying
              ? "Verifying…"
              : "Verify Current Email"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-[#59D9FF]/10 bg-[#59D9FF]/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
            Security
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            The current email must be verified before the new email receives its verification code.
          </p>
        </section>
      </main>
    );
  }

  if (screen === "email-new" && profile) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            setScreen("profile");
            setEmailError("");
            setEmailCode("");
          }}
          className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            Step 2 of 2
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Verify New Email
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Enter the 6-digit verification code sent to your new email address.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
              Code sent to
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white/75">
              {emailTarget}
            </p>
          </div>

          <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-white/35">
            Verification code
          </label>

          <input
            value={emailCode}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, "")
                .slice(0, 6);

              setEmailCode(value);
              setEmailError("");
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="000000"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center text-2xl font-black tracking-[0.35em] text-white outline-none placeholder:text-white/20 focus:border-[#59D9FF]/40"
          />

          {emailError && (
            <p className="mt-3 text-xs font-bold text-red-300">
              {emailError}
            </p>
          )}

          <button
            type="button"
            disabled={emailVerifying || emailCode.length !== 6}
            onClick={async () => {
              if (emailCode.length !== 6) {
                setEmailError(
                  "Enter the 6-digit verification code."
                );
                return;
              }

              setEmailVerifying(true);
              setEmailError("");

              try {
                const response = await fetch(
                  "/api/admin/profile/email/verify-new",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      requestId: emailRequestId,
                      code: emailCode,
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(
                    data?.error ||
                      "Unable to complete email change."
                  );
                }

                setEmailCode("");
                setEmailRequestId("");
                setEmailTarget("");
                setEmailError("");

                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        email: data.email,
                      }
                    : current
                );

                setScreen("profile");

                window.location.href = "/admin";
              } catch (err) {
                setEmailError(
                  err instanceof Error
                    ? err.message
                    : "Unable to complete email change."
                );
              } finally {
                setEmailVerifying(false);
              }
            }}
            className="mt-5 w-full rounded-xl bg-[#59D9FF] px-4 py-3 text-sm font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailVerifying
              ? "Changing email…"
              : "Verify & Change Email"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-[#59D9FF]/10 bg-[#59D9FF]/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
            Final step
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            Your owner email changes only after this code is verified.
            Your current admin session will then be invalidated and you must sign in again.
          </p>
        </section>
      </main>
    );
  }

  if (screen === "email" && profile) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            setScreen("profile");
            setEmailError("");
          }}
          className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            Security
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Change Owner Email
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Your current email must be verified before the new email can be used.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
          <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/35">
              Current email
            </p>

            <p className="mt-2 truncate text-sm font-bold text-white/75">
              {profile.email}
            </p>
          </div>

          <label className="mt-5 block text-[10px] font-black uppercase tracking-wider text-white/35">
            New email address
          </label>

          <input
            value={newEmail}
            onChange={(event) => {
              setNewEmail(event.target.value);
              setEmailError("");
            }}
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="new@email.com"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/40"
          />

          {emailError && (
            <p className="mt-3 text-xs font-bold text-red-300">
              {emailError}
            </p>
          )}

          <button
            type="button"
            disabled={emailSaving}
            onClick={async () => {
              const email = newEmail.trim().toLowerCase();

              if (!email || !email.includes("@")) {
                setEmailError("Enter a valid email address.");
                return;
              }

              if (email === profile.email.toLowerCase()) {
                setEmailError(
                  "Enter a different email address."
                );
                return;
              }

              setEmailSaving(true);
              setEmailError("");

              try {
                const response = await fetch(
                  "/api/admin/profile/email/request",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      newEmail: email,
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(
                    data?.error ||
                      "Unable to start email change."
                  );
                }

                setEmailRequestId(data.requestId);
                setEmailCode("");
                setEmailError("");
                setScreen("email-current");
                setNewEmail("");
              } catch (err) {
                setEmailError(
                  err instanceof Error
                    ? err.message
                    : "Unable to start email change."
                );
              } finally {
                setEmailSaving(false);
              }
            }}
            className="mt-5 w-full rounded-xl bg-[#59D9FF] px-4 py-3 text-sm font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailSaving ? "Sending verification…" : "Continue"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-[#59D9FF]/10 bg-[#59D9FF]/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
            Verification required
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            A verification code will be sent to your current email first.
            Nothing changes until the verification process is completed.
          </p>
        </section>
      </main>
    );
  }

  if (screen === "name" && profile) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-10 sm:px-8">
        <button
          type="button"
          onClick={() => {
            setScreen("profile");
            setNameError("");
          }}
          className="mb-6 flex min-h-11 items-center gap-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          <span className="text-lg">←</span>
          Back to Profile
        </button>

        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            Account
          </p>

          <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
            Change Display Name
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/45">
            Update the name shown on your PABLOT owner profile.
          </p>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0d141e] p-5">
          <label className="text-[10px] font-black uppercase tracking-wider text-white/35">
            Display name
          </label>

          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setNameError("");
            }}
            autoFocus
            maxLength={80}
            placeholder="PABLOT Owner"
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#59D9FF]/40"
          />

          <p className="mt-2 text-[11px] text-white/25">
            2–80 characters
          </p>

          {nameError && (
            <p className="mt-3 text-xs font-bold text-red-300">
              {nameError}
            </p>
          )}

          <button
            type="button"
            disabled={nameSaving}
            onClick={async () => {
              const nextName = displayName.trim();

              if (nextName.length < 2) {
                setNameError(
                  "Display name must be at least 2 characters."
                );
                return;
              }

              if (nextName.length > 80) {
                setNameError(
                  "Display name must be 80 characters or fewer."
                );
                return;
              }

              if (nextName === profile.displayName) {
                setNameError(
                  "Enter a different display name."
                );
                return;
              }

              setNameSaving(true);
              setNameError("");

              try {
                const response = await fetch(
                  "/api/admin/profile/name",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      displayName: nextName,
                    }),
                  }
                );

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(
                    data?.error ||
                      "Unable to update display name."
                  );
                }

                setProfile(data.profile);
                setScreen("profile");
              } catch (err) {
                setNameError(
                  err instanceof Error
                    ? err.message
                    : "Unable to update display name."
                );
              } finally {
                setNameSaving(false);
              }
            }}
            className="mt-5 w-full rounded-xl bg-[#59D9FF] px-4 py-3 text-sm font-black text-[#061018] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nameSaving ? "Saving…" : "Save Display Name"}
          </button>
        </section>

        <section className="mt-4 rounded-2xl border border-white/10 bg-[#0d141e] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#59D9FF]">
            Security
          </p>

          <p className="mt-2 text-xs leading-5 text-white/40">
            A security notification will be sent to your current owner email after this change.
          </p>
        </section>
      </main>
    );
  }

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
                <div className="flex items-center gap-1">
                  <p className="truncate text-lg font-black">
                    {profile.displayName}
                  </p>

                  <button
                    type="button"
                    aria-label="Edit display name"
                    onClick={() => {
                      setDisplayName(profile.displayName);
                      setNameError("");
                      setScreen("name");
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm text-white/45 transition hover:bg-white/5 hover:text-[#59D9FF]"
                  >
                    ✏️
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <p className="truncate text-sm text-white/45">
                    {profile.email}
                  </p>

                  <button
                    type="button"
                    aria-label="Edit owner email"
                    onClick={() => {
                      setNewEmail("");
                      setEmailError("");
                      setScreen("email");
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-white/45 transition hover:bg-white/5 hover:text-[#59D9FF]"
                  >
                    ✏️
                  </button>
                </div>
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
