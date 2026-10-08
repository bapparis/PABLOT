"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ProfileUser {
  pp_balance: number;
  total_earned: number;
}
import TelegramProfile from "./TelegramProfile";
import BottomNav from "@/components/BottomNav";

const items = [
  {
    icon: "💰",
    title: "Wallet",
    description: "Manage your balance and withdrawal wallet",
    href: "/wallet",
  },
  {
    icon: "↗️",
    title: "Withdraw",
    description: "Request a crypto payout",
    href: "/withdraw",
  },
  {
    icon: "🎁",
    title: "Referrals",
    description: "Invite friends and earn bonuses",
    href: "/referrals",
  },
  {
    icon: "✅",
    title: "My Tasks",
    description: "View available and completed tasks",
    href: "/tasks",
  },
];

export default function ProfilePage() {
  const [supportEnabled, setSupportEnabled] = useState(false);
  const [supportUrl, setSupportUrl] = useState("");
  const [user, setUser] = useState<ProfileUser | null>(null);

  useEffect(() => {
    fetch("/api/platform/support")
      .then((response) => response.json())
      .then((data) => {
        setSupportEnabled(data.enabled === true);
        setSupportUrl(
          typeof data.url === "string" ? data.url : ""
        );
      })
      .catch(() => {
        setSupportEnabled(false);
        setSupportUrl("");
      });
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
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300/70">
            PABLOT ACCOUNT
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight">
            Profile
          </h1>

          <p className="mt-1 text-sm text-white/35">
            Your account, rewards and settings
          </p>
        </header>

        <TelegramProfile onUserLoaded={setUser} />

        <section className="mt-4 grid grid-cols-2 gap-3">
          <Link
            href="/wallet"
            className="glass-panel rounded-[22px] p-5 transition active:scale-[0.98]"
          >
            <p className="text-xs text-white/40">
              Available
            </p>

            <p className="mt-2 text-2xl font-black">
              {(user?.pp_balance ?? 0).toLocaleString()}
            </p>

            <p className="mt-1 text-xs font-bold text-emerald-300">
              PP
            </p>
          </Link>

          <Link
            href="/wallet"
            className="glass-panel rounded-[22px] p-5 transition active:scale-[0.98]"
          >
            <p className="text-xs text-white/40">
              Total earned
            </p>

            <p className="mt-2 text-2xl font-black">
              {(user?.total_earned ?? 0).toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-white/30">
              lifetime PP
            </p>
          </Link>
        </section>

        <section className="glass-panel mt-4 overflow-hidden rounded-[24px]">
          <div className="px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/30">
              Your PABLOT
            </p>
          </div>

          {items.map((item, index) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-4 transition active:bg-white/5 ${
                index > 0 ? "border-t border-white/6" : ""
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-lg">
                {item.icon}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">
                  {item.title}
                </span>

                <span className="mt-1 block text-xs text-white/35">
                  {item.description}
                </span>
              </span>

              <span className="text-lg text-white/20">
                ›
              </span>
            </Link>
          ))}
        </section>

        <section className="glass-panel mt-4 overflow-hidden rounded-[24px]">
          <div className="px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/30">
              App
            </p>
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition active:bg-white/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
              🌐
            </span>

            <span className="flex-1">
              <span className="block text-sm font-bold">
                Language
              </span>

              <span className="mt-1 block text-xs text-white/35">
                English
              </span>
            </span>

            <span className="text-lg text-white/20">
              ›
            </span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-4 border-t border-white/6 px-5 py-4 text-left transition active:bg-white/5"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-lg">
              🔔
            </span>

            <span className="flex-1">
              <span className="block text-sm font-bold">
                Notifications
              </span>

              <span className="mt-1 block text-xs text-white/35">
                Manage your notifications
              </span>
            </span>

            <span className="text-lg text-white/20">
              ›
            </span>
          </button>

          {supportEnabled && (
            <button
              type="button"
              onClick={openSupport}
              disabled={!supportUrl}
              className="flex w-full items-center gap-4 border-t border-white/6 px-5 py-4 text-left transition active:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 text-lg">
                🆘
              </span>

              <span className="flex-1">
                <span className="block text-sm font-bold">
                  Support
                </span>

                <span className="mt-1 block text-xs text-white/35">
                  Get help from the PABLOT team
                </span>
              </span>

              <span className="text-lg text-white/20">
                ›
              </span>
            </button>
          )}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="glass-panel rounded-2xl p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-lg">🏆</span>
            <span className="mt-3 block text-sm font-bold">
              Achievements
            </span>
            <span className="mt-1 block text-xs text-white/30">
              Coming soon
            </span>
          </button>

          <button
            type="button"
            className="glass-panel rounded-2xl p-4 text-left transition active:scale-[0.98]"
          >
            <span className="text-lg">📊</span>
            <span className="mt-3 block text-sm font-bold">
              Earnings
            </span>
            <span className="mt-1 block text-xs text-white/30">
              Coming soon
            </span>
          </button>
        </section>

        <section className="mt-4 flex items-center justify-center gap-3 py-4 text-[11px] text-white/25">
          <button type="button">Terms</button>
          <span>•</span>
          <button type="button">Privacy</button>
        </section>

        <footer className="pb-4 text-center">
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
