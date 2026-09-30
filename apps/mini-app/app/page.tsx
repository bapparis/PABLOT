"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  const adController = useRef<AdsgramAdController | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adMessage, setAdMessage] = useState("");

  useEffect(() => {
    if (typeof Adsgram !== "undefined") {
      adController.current = Adsgram.init({
        blockId: "51135",
      });
    }
  }, []);

  const handleWatchAd = async () => {
    if (!adController.current || adLoading) return;

    setAdLoading(true);
    setAdMessage("");

    try {
      await adController.current.show();
      setAdMessage("✅ Ad completed successfully.");
    } catch {
      setAdMessage("Ad was skipped or could not be completed.");
    } finally {
      setAdLoading(false);
    }
  };
  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        {/* Header */}
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/45">WELCOME TO</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight">
              PABLOT
            </h1>
          </div>

          <button
            className="glass-panel flex h-11 w-11 items-center justify-center rounded-full text-lg"
            aria-label="Profile"
          >
            👤
          </button>
        </header>

        {/* Balance */}
        <section className="balance-card relative overflow-hidden rounded-[28px] p-6">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />

          <p className="relative text-sm font-medium text-white/55">
            AVAILABLE BALANCE
          </p>

          <div className="relative mt-2 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">
              0
            </span>
            <span className="mb-1 text-sm font-bold text-emerald-300">
              PP
            </span>
          </div>

          <div className="relative mt-5 flex items-center justify-between">
            <span className="text-xs text-white/45">
              Total earned
            </span>
            <span className="text-sm font-bold">
              0 PP
            </span>
          </div>
        </section>

        {/* Daily Check */}
        <section className="glass-panel mt-4 overflow-hidden rounded-[24px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                DAILY CHECK-IN
              </p>
              <h2 className="mt-1.5 text-lg font-black">
                Complete your daily check
              </h2>
              <p className="mt-1 text-xs text-white/45">
                Watch 3 ads to complete today’s check.
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              🎁
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
              <div className="h-full w-0 rounded-full bg-emerald-400 transition-all" />
            </div>

            <span className="text-xs font-bold text-white/55">
              0 / 3
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-1.5 rounded-full bg-white/10" />
            <div className="h-1.5 rounded-full bg-white/10" />
            <div className="h-1.5 rounded-full bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleWatchAd}
            disabled={adLoading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adLoading ? "Loading Ad..." : "▶ Watch Ads & Check In"}
          </button>

          {adMessage && (
            <p className="mt-2 text-center text-[11px] font-semibold text-white/45">
              {adMessage}
            </p>
          )}
        </section>

        {/* Daily progress */}
        <section className="glass-panel mt-4 rounded-[24px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">Daily progress</p>
              <p className="mt-1 text-xs text-white/45">
                Complete tasks to earn PP
              </p>
            </div>

            <span className="text-sm font-bold text-emerald-300">
              0%
            </span>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
            <div className="h-full w-0 rounded-full bg-emerald-400" />
          </div>

          <div className="mt-3 flex justify-between text-xs text-white/40">
            <span>0 completed</span>
            <span>0 available</span>
          </div>
        </section>

        {/* Tasks */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Tasks</h2>
            <span className="text-xs font-semibold text-white/40">
              Earn PP
            </span>
          </div>

          <div className="space-y-3">

            <TaskCard
              icon="✈️"
              title="Join our Telegram"
              description="Join the official PABLOT channel"
              reward="+50 PP"
            />

            <TaskCard
              icon="▶️"
              title="Watch a video"
              description="Watch and complete the task"
              reward="+10 PP"
            />

            <TaskCard
              icon="🔗"
              title="Visit a website"
              description="Visit the sponsored page"
              reward="+20 PP"
            />

          </div>
        </section>

        {/* Referral */}
        <section className="glass-panel mt-5 rounded-[24px] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              🎁
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">Invite & earn</p>
              <p className="mt-1 text-xs text-white/45">
                Earn bonus PP when your referrals become active.
              </p>
            </div>

            <span className="text-lg">›</span>
          </div>
        </section>

      </div>

      {/* Floating navigation */}
      <BottomNav />
    </main>
  );
}

function TaskCard({
  icon,
  title,
  description,
  reward,
}: {
  icon: string;
  title: string;
  description: string;
  reward: string;
}) {
  return (
    <button className="task-card group flex w-full items-center gap-4 rounded-[22px] p-4 text-left">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/6 text-xl transition-transform duration-200 group-active:scale-90">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 truncate text-xs text-white/40">
          {description}
        </p>
      </div>

      <div className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300">
        {reward}
      </div>
    </button>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: string;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex min-w-[58px] flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[10px] font-semibold transition ${
        active
          ? "bg-emerald-400/10 text-emerald-300"
          : "text-white/40"
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
