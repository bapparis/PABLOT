"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function SecurityPage() {
  const [supportUrl, setSupportUrl] = useState("");

  useEffect(() => {
    fetch("/api/platform/support")
      .then((response) => response.json())
      .then((data) => {
        if (typeof data.url === "string") {
          setSupportUrl(data.url);
        }
      })
      .catch(() => {});
  }, []);

  function openSupport() {
    if (!supportUrl) return;

    const url = /^https?:\/\//i.test(supportUrl)
      ? supportUrl
      : `https://${supportUrl}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-6">
          <Link
            href="/profile"
            className="text-sm font-semibold text-white/45"
          >
            ← Profile
          </Link>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/70">
            ACCOUNT
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Security & Privacy
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/40">
            Manage your account security and understand how PABLOT handles
            your information.
          </p>
        </header>

        <section className="glass-panel overflow-hidden rounded-[24px]">
          <div className="border-b border-white/6 p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-xl">
                🛡️
              </span>

              <div>
                <h2 className="text-sm font-black">
                  Account Security
                </h2>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  Your PABLOT account uses your Telegram identity to
                  authenticate your Mini App session.
                </p>
              </div>
            </div>
          </div>

          <div className="border-b border-white/6 p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                🔐
              </span>

              <div>
                <h2 className="text-sm font-black">
                  Privacy
                </h2>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  PABLOT uses account, task, referral, wallet and transaction
                  information to provide the service and process rewards.
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                🧾
              </span>

              <div>
                <h2 className="text-sm font-black">
                  Your Data
                </h2>

                <p className="mt-1 text-xs leading-5 text-white/40">
                  Your PABLOT ID, Telegram account information, balances,
                  task activity, referrals and withdrawal records may be
                  associated with your account.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="glass-panel mt-4 rounded-[24px] p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-xl">
              ⚠️
            </span>

            <div>
              <h2 className="text-sm font-black">
                Account deletion
              </h2>

              <p className="mt-1 text-xs leading-5 text-white/40">
                If you want to delete your PABLOT account, contact Support.
                Some records may need to be retained for security, fraud
                prevention or financial record-keeping.
              </p>
            </div>
          </div>
        </section>

        {supportUrl && (
          <button
            type="button"
            onClick={openSupport}
            className="mt-4 flex w-full items-center gap-4 rounded-[24px] border border-emerald-400/20 bg-emerald-400/5 p-5 text-left transition active:scale-[0.99]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/10 text-xl">
              🆘
            </span>

            <span className="flex-1">
              <span className="block text-sm font-black">
                Contact Support
              </span>

              <span className="mt-1 block text-xs text-white/40">
                Need help with your account?
              </span>
            </span>

            <span className="text-lg text-white/25">
              ›
            </span>
          </button>
        )}

        <footer className="py-8 text-center">
          <p className="text-xs font-black tracking-[0.2em] text-white/30">
            PABLOT
          </p>

          <p className="mt-1 text-[10px] text-white/20">
            powered by BAGLOT
          </p>
        </footer>
      </div>

      <BottomNav />
    </main>
  );
}
