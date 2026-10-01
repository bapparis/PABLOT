"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";

export default function Home() {
  const adController = useRef<AdsgramAdController | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adMessage, setAdMessage] = useState("");
  const [streakDay, setStreakDay] = useState(1);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [treasureUnlocked, setTreasureUnlocked] = useState(false);
  const [treasureClaimed, setTreasureClaimed] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [treasureLoading, setTreasureLoading] = useState(false);

  useEffect(() => {
    if (typeof Adsgram !== "undefined") {
      adController.current = Adsgram.init({
        blockId: "51135",
      });
    }
  }, []);

  const loadDailyCheck = async () => {
    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData;

    if (!initData) return;

    try {
      const response = await fetch("/api/daily-check", {
        headers: {
          "x-telegram-init-data": initData,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      setStreakDay(data.streak_day ?? 1);
      setCheckedInToday(data.checked_in_today ?? false);
      setTreasureUnlocked(data.treasure_unlocked ?? false);
      setTreasureClaimed(data.treasure_claimed ?? false);
    } catch {
      // Keep the existing UI state if loading fails.
    }
  };

  useEffect(() => {
    loadDailyCheck();
  }, []);

  const handleDailyCheckIn = async () => {
    if (dailyLoading || checkedInToday) return;

    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      setAdMessage("Telegram session not available.");
      return;
    }

    setDailyLoading(true);
    setAdMessage("");

    try {
      const response = await fetch("/api/daily-check", {
        method: "POST",
        headers: {
          "x-telegram-init-data": initData,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setAdMessage("Unable to check in. Please try again.");
        return;
      }

      setStreakDay(data.streak_day ?? 1);
      setCheckedInToday(data.checked_in_today ?? true);
      setTreasureUnlocked(data.treasure_unlocked ?? false);
      setTreasureClaimed(data.treasure_claimed ?? false);
      setAdMessage("✅ Daily check-in complete!");
    } catch {
      setAdMessage("Something went wrong. Please try again.");
    } finally {
      setDailyLoading(false);
    }
  };

  const handleTreasure = async () => {
    if (
      treasureLoading ||
      !treasureUnlocked ||
      treasureClaimed
    ) {
      return;
    }

    const initData = window.Telegram?.WebApp?.initData;

    if (!initData) {
      setAdMessage("Telegram session not available.");
      return;
    }

    setTreasureLoading(true);
    setAdMessage("");

    try {
      const response = await fetch("/api/daily-treasure", {
        method: "POST",
        headers: {
          "x-telegram-init-data": initData,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        setAdMessage(
          data.error === "TREASURE_NOT_UNLOCKED"
            ? "Treasure is not unlocked yet."
            : "Unable to open treasure. Please try again."
        );
        return;
      }

      setTreasureClaimed(true);
      setAdMessage(
        `🎉 Treasure opened! +${data.reward_pp ?? 0} PP`
      );
    } catch {
      setAdMessage("Something went wrong. Please try again.");
    } finally {
      setTreasureLoading(false);
    }
  };

  const handleWatchAd = async () => {
    if (adLoading || dailyLoading) return;

    setAdLoading(true);
    setAdMessage("");

    try {
      const monetag = (
        window as typeof window & {
          show_11934399?: (options?: {
            ymid?: string;
            requestVar?: string;
          }) => Promise<unknown>;
        }
      ).show_11934399;

      if (!monetag) {
        setAdMessage("Monetag ad is not ready yet. Please try again.");
        return;
      }

      setAdMessage("📺 Loading rewarded ad...");

      const webApp = window.Telegram?.WebApp;
      const telegramId = webApp?.initDataUnsafe?.user?.id;

      const ymid = telegramId
        ? `pablot_daily_${telegramId}_${Date.now()}_${crypto.randomUUID()}`
        : `pablot_daily_${Date.now()}_${crypto.randomUUID()}`;

      await monetag({
        ymid,
        requestVar: "daily_check",
      });

      setAdMessage("✅ Ad completed. Confirming reward...");

      const initData = webApp?.initData;

      if (!initData) {
        setAdMessage("Telegram session not available.");
        return;
      }

      setDailyLoading(true);

      let confirmed = false;

      for (let attempt = 0; attempt < 20; attempt++) {
        const response = await fetch("/api/monetag/claim", {
          method: "POST",
          headers: {
            "x-telegram-init-data": initData,
          },
        });

        const data = await response.json();

        if (response.ok && data.status === "CLAIMED") {
          confirmed = true;

          if (data.reward_granted) {
            setAdMessage("✅ Ad reward confirmed.");
          } else {
            setAdMessage("✅ Ad completed and reward confirmed.");
          }

          break;
        }

        if (attempt < 19) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      if (!confirmed) {
        setAdMessage(
          "⏳ Ad completed. Waiting for Monetag reward confirmation..."
        );
      }
    } catch {
      setAdMessage("Ad was skipped or could not be completed.");
    } finally {
      setAdLoading(false);
      setDailyLoading(false);
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

          <a
            href="/profile"
            className="glass-panel flex h-11 w-11 items-center justify-center rounded-full text-lg"
            aria-label="Profile"
          >
            👤
          </a>
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
                Build your streak
              </h2>
              <p className="mt-1 text-xs text-white/45">
                Check in once every day to keep your streak alive.
              </p>
            </div>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/10 text-xl">
              🔥
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                CURRENT STREAK
              </p>
              <p className="mt-1 text-2xl font-black">
                Day {Math.min(streakDay, 7)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                TREASURE
              </p>
              <p className="mt-1 text-xs font-bold text-white/55">
                {treasureClaimed
                  ? "Opened"
                  : treasureUnlocked
                    ? "Unlocked"
                    : `${Math.max(0, 7 - streakDay)} day${7 - streakDay === 1 ? "" : "s"} left`}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div
                key={day}
                className={`h-1.5 rounded-full ${
                  day <= streakDay
                    ? "bg-emerald-400"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleDailyCheckIn}
            disabled={dailyLoading || checkedInToday}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checkedInToday
              ? "✅ CHECKED"
              : dailyLoading
                ? "CHECKING..."
                : "CHECK-IN"}
          </button>

          {treasureUnlocked && !treasureClaimed && (
            <button
              type="button"
              onClick={handleTreasure}
              disabled={treasureLoading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-300/20 bg-yellow-300/10 px-4 py-3 text-sm font-black text-yellow-200 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {treasureLoading
                ? "OPENING..."
                : "🎁 OPEN TREASURE"}
            </button>
          )}

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
