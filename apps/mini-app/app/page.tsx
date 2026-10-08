"use client";

import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import type { HomeBanner } from "@/lib/home-banners";

export default function Home() {
  const adController = useRef<AdsgramAdController | null>(null);
  const [adLoading, setAdLoading] = useState(false);
  const [adMessage, setAdMessage] = useState("");
  const [streakDay, setStreakDay] = useState(1);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [dailyAdsCompleted, setDailyAdsCompleted] = useState(0);
  const [treasureUnlocked, setTreasureUnlocked] = useState(false);
  const [treasureClaimed, setTreasureClaimed] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [treasureLoading, setTreasureLoading] = useState(false);
  const [ppBalance, setPpBalance] = useState(0);
  const [ppPerUsd, setPpPerUsd] = useState(1000);
  const [totalEarned, setTotalEarned] = useState(0);
  const [tasks, setTasks] = useState<
    Array<{
      id: string;
      title: string;
      description: string | null;
      type: string;
      reward_pp: number;
      target_url: string | null;
      proof_required: boolean;
      watch_config?: {
        ads_required: number;
        watch_duration_seconds: number;
        cooldown_seconds: number;
        pinned: boolean;
        pin_order: number;
      } | null;
    }>
  >([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [homeBanners, setHomeBanners] = useState<HomeBanner[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    let active = true;

    fetch("/api/platform/banners")
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && Array.isArray(data?.banners)) {
          setHomeBanners(data.banners);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (homeBanners.length < 2) {
      setActiveBannerIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveBannerIndex((index) => (index + 1) % homeBanners.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [homeBanners.length]);


  useEffect(() => {
    const initializeTelegramUser = async () => {
      const webApp = window.Telegram?.WebApp;
      const initData = webApp?.initData;
      const startParam = new URLSearchParams(
        window.location.search
      ).get("startapp");

      if (!initData) return;

      try {
        await fetch("/api/telegram/user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            initData,
            startParam,
          }),
        });
      } catch {
        // Keep the existing home screen available if account sync fails.
      }
    };

    initializeTelegramUser();
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      const initData = window.Telegram?.WebApp?.initData;
      if (!initData) {
        if (active) setTasksLoading(false);
        return;
      }

      try {
        const [userResponse, tasksResponse, settingsResponse] = await Promise.all([
          fetch("/api/telegram/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData,
              startParam: new URLSearchParams(window.location.search).get("startapp"),
            }),
          }),
          fetch("/api/tasks"),
          fetch("/api/platform/public-settings"),
        ]);

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          const rate = Number(settingsData.ppPerUsd);
          if (active && Number.isFinite(rate) && rate > 0) {
            setPpPerUsd(rate);
          }
        }

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const user = userData.user;

          if (active && user) {
            setPpBalance(Number(user.pp_balance) || 0);
            setTotalEarned(Number(user.total_earned) || 0);
          }
        }

        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();

          if (active) {
            setTasks(Array.isArray(tasksData.tasks) ? tasksData.tasks : []);
          }
        }

        const completedResponse = await fetch("/api/tasks/completed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();

          if (active) {
            setCompletedTaskIds(
              Array.isArray(completedData.completedTaskIds)
                ? completedData.completedTaskIds
                : []
            );
          }
        }
      } catch {
        // Keep the home screen available if data loading fails.
      } finally {
        if (active) setTasksLoading(false);
      }
    }

    loadHomeData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const initializeAdsgram = () => {
      if (typeof Adsgram !== "undefined") {
        adController.current = Adsgram.init({
          blockId: "51135",
        });
        return;
      }

      attempts += 1;

      if (attempts < 20) {
        timer = setTimeout(initializeAdsgram, 500);
      }
    };

    initializeAdsgram();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
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
      setDailyAdsCompleted(
        Math.min(data.ads_completed ?? 0, 3)
      );
      setCheckedInToday(data.checked_in_today ?? false);
      setTreasureUnlocked(data.treasure_unlocked ?? false);
      setTreasureClaimed(data.treasure_claimed ?? false);
      return data.streak_day ?? 1;
    } catch {
      // Keep the existing UI state if loading fails.
    }
    return null;
  };

  useEffect(() => {
    loadDailyCheck();
  }, []);

  const handleDailyCheckIn = async () => {
    if (dailyLoading || checkedInToday) return;

    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData;

    if (!initData) {
      setAdMessage("Telegram session not available.");
      return;
    }

    setDailyLoading(true);
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
        setAdMessage("Please wait a few seconds, then try again.");
        return;
      }

      for (let adNumber = 1; adNumber <= 3; adNumber++) {
        setAdMessage(
          `📺 Loading ad ${adNumber}/3...`
        );

        const telegramId = webApp?.initDataUnsafe?.user?.id;

        const ymid = telegramId
          ? `pablot_daily_${telegramId}_${Date.now()}_${crypto.randomUUID()}`
          : `pablot_daily_${Date.now()}_${crypto.randomUUID()}`;

        await monetag({
          ymid,
          requestVar: "daily_check",
        });

        setAdMessage(
          `⏳ Ad ${adNumber}/3 completed. Confirming reward...`
        );

        let confirmed = false;
        let rewardData: {
          ads_completed?: number;
          reward_granted?: boolean;
          status?: string;
        } | null = null;

        for (let attempt = 0; attempt < 20; attempt++) {
          const response = await fetch("/api/monetag/claim", {
            method: "POST",
            headers: {
              "x-telegram-init-data": initData,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ymid }),
          });

          const data = await response.json();

          if (response.ok && data.status === "CLAIMED") {
            confirmed = true;
            rewardData = data;
            break;
          }

          if (attempt < 19) {
            await new Promise((resolve) =>
              setTimeout(resolve, 2000)
            );
          }
        }

        if (!confirmed) {
          setAdMessage(
            `⏳ Please wait while we confirm ad ${adNumber}/3...`
          );
          return;
        }

        const completed = Math.min(
          Number(rewardData?.ads_completed ?? 0),
          3
        );

        setDailyAdsCompleted(completed);

        setAdMessage(
          completed >= 3
            ? `🔥 Day ${streakDay} streak! +${streakDay >= 7 ? 50 : 10} PP`
            : `🟩 ${completed >= 2 ? "🟩" : "⬜"} ${completed >= 3 ? "🟩" : "⬜"}`
        );

        if (completed >= 3 && rewardData?.reward_granted) {
          setCheckedInToday(true);
          setStreakDay((prev) => Math.min(prev + 1, 7));

          const updatedStreakDay = await loadDailyCheck();

          setAdMessage(
            updatedStreakDay >= 7
              ? "🎉 7 day streak completed! 🎁 Treasure unlocked!"
              : `🔥 Day ${updatedStreakDay} streak! +${updatedStreakDay >= 7 ? 50 : 10} PP`
          );
          break;
        }
      }
    } catch {
      setAdMessage("The ad could not be completed. Please wait a few seconds and try again.");
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
      const webApp = window.Telegram?.WebApp;
      const initData = webApp?.initData;

      if (!initData) {
        setAdMessage("Telegram session not available.");
        return;
      }

      const attemptResponse = await fetch(
        "/api/adsgram/attempt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ initData }),
        }
      );

      const attemptData = await attemptResponse.json();

      if (!attemptResponse.ok) {
        if (
          attemptData.error ===
          "AD_ATTEMPT_ALREADY_PENDING"
        ) {
          setAdMessage(
            "⏳ Your previous ad is still being confirmed."
          );
        } else {
          setAdMessage(
            "Unable to start the ad. Please try again."
          );
        }

        return;
      }

      const attemptId = attemptData.attemptId;

      if (!attemptId) {
        setAdMessage(
          "Unable to create an ad attempt."
        );
        return;
      }

      if (!adController.current) {
        setAdMessage(
          "Ads are still loading. Please try again."
        );
        return;
      }

      setAdMessage("📺 Loading rewarded ad...");

      const adResult = await adController.current.show();

      if (!adResult.done || adResult.error) {
        setAdMessage(
          "The ad could not be completed."
        );
        return;
      }

      setAdMessage(
        "⏳ Ad finished. Confirming reward..."
      );

      let consumed = false;

      for (let attempt = 0; attempt < 20; attempt++) {
        const response = await fetch(
          "/api/adsgram/consume",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initData,
              attemptId,
            }),
          }
        );

        const data = await response.json();

        if (
          response.ok &&
          (data.status === "CONSUMED" ||
            data.status === "ALREADY_CONSUMED")
        ) {
          consumed = true;

          if (data.status === "CONSUMED") {
            setAdMessage(
              `🎉 +${data.rewardPp ?? 10} PP earned!`
            );
          } else {
            setAdMessage(
              "✅ Ad reward already confirmed."
            );
          }

          break;
        }

        if (
          response.status !== 409 ||
          data.error !== "AD_NOT_CONFIRMED"
        ) {
          setAdMessage(
            "Unable to confirm the ad reward."
          );
          break;
        }

        if (attempt < 19) {
          await new Promise((resolve) =>
            setTimeout(resolve, 2000)
          );
        }
      }

      if (consumed) {
        const [userResponse, completedResponse] = await Promise.all([
          fetch("/api/telegram/user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData,
              startParam: new URLSearchParams(window.location.search).get("startapp"),
            }),
          }),
          fetch("/api/tasks/completed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          }),
        ]);

        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.user) {
            setPpBalance(Number(userData.user.pp_balance) || 0);
            setTotalEarned(Number(userData.user.total_earned) || 0);
          }
        }

        if (completedResponse.ok) {
          const completedData = await completedResponse.json();
          setCompletedTaskIds(
            Array.isArray(completedData.completedTaskIds)
              ? completedData.completedTaskIds
              : []
          );
        }
      }

      if (!consumed) {
        setAdMessage(
          "⏳ Ad completed. Reward confirmation is still pending."
        );
      }
    } catch {
      setAdMessage(
        "The ad could not be completed. Please try again."
      );
    } finally {
      setAdLoading(false);
    }
  };
  return (
    <main className="min-h-screen px-4 pb-28 pt-5">
      <div className="mx-auto w-full max-w-md">

        {/* Premium PABLOT Identity */}
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-[0.32em] text-emerald-200/75">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              WELCOME TO
            </p>

            <h1 className="mt-1 bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-3xl font-black leading-none tracking-[0.12em] text-transparent drop-shadow-[0_0_14px_rgba(52,211,153,0.22)]">
              PABLOT
            </h1>

            <div className="mt-2 h-[2px] w-16 rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-transparent" />
          </div>

          <a
            href="/profile"
            className="glass-panel flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-emerald-300/15 text-lg transition duration-200 hover:border-emerald-300/40 hover:bg-emerald-300/10 active:scale-95"
            aria-label="Profile"
          >
            👤
          </a>
        </header>

        {/* Balance */}
        <section className="balance-card relative overflow-hidden rounded-[28px] p-5">
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-400/10 blur-2xl" />

          <p className="relative text-sm font-medium text-white/55">
            AVAILABLE BALANCE
          </p>

          <div className="relative mt-2 flex items-end gap-2">
            <span className="text-4xl font-black tracking-tight">
              {ppBalance.toLocaleString()}
            </span>
            <span className="mb-1 text-sm font-bold text-emerald-300">
              PP
            </span>
          </div>

          <p className="relative mt-1 text-sm font-semibold text-emerald-300">
            ≈ {(ppBalance / ppPerUsd).toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} estimated value
          </p>

          <div className="relative mt-4 flex items-center justify-between">
            <span className="text-xs text-white/45">
              Total earned
            </span>
            <span className="text-sm font-bold">
              {totalEarned.toLocaleString()} PP
            </span>
          </div>
        </section>

        {/* Daily Check */}
        <section className="glass-panel mt-2 rounded-[16px] px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300">
                DAILY CHECK-IN
              </p>
              <p className="mt-0.5 text-xs font-black">
                Day {Math.min(streakDay, 7)} streak
              </p>
            </div>

            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-xs">
              🔥
            </div>
          </div>

          <div className="mt-2 flex items-center justify-center gap-1.5">
            {[1, 2, 3].map((ad) => (
              <div
                key={ad}
                className={`h-1 w-8 rounded-full transition-all duration-300 ${
                  ad <= dailyAdsCompleted
                    ? "bg-emerald-400"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          <p className="mt-1 text-center text-[9px] font-semibold text-white/35">
            {checkedInToday
              ? "3/3 ads completed"
              : "Watch 3 rewarded ads to check in"}
          </p>

          <div className="mt-1.5 flex justify-center">
            <button
              type="button"
              onClick={handleDailyCheckIn}
              disabled={dailyLoading || checkedInToday}
              className="min-h-8 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-[10px] font-black text-black transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkedInToday
                ? "✅ CHECKED"
                : dailyLoading
                  ? "◌ LOADING..."
                  : "CHECK-IN"}
            </button>
          </div>

          {treasureUnlocked && !treasureClaimed && (
            <div className="mt-1.5 flex justify-center">
              <button
                type="button"
                onClick={handleTreasure}
                disabled={treasureLoading}
                className="rounded-lg border border-yellow-300/20 bg-yellow-300/10 px-4 py-1.5 text-[10px] font-black text-yellow-200 transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {treasureLoading
                  ? "OPENING..."
                  : "🎁 OPEN TREASURE"}
              </button>
            </div>
          )}

          {adMessage && (
            <p className="mt-1 text-center text-[10px] font-semibold text-white/40">
              {adMessage}
            </p>
          )}
        </section>

        {homeBanners.length > 0 && (
          <section className="mt-2" aria-label="PABLOT promotions">
            <div className="relative h-[104px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b1820]">
              {homeBanners.map((banner, index) =>
                index === activeBannerIndex % homeBanners.length ? (
                  <div key={banner.id} className="absolute inset-0">
                    {banner.imageUrl && (
                      <img
                        src={banner.imageUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover opacity-35"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#071018] via-[#071018]/85 to-transparent" />
                    <div className="relative flex h-full items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-emerald-300">
                          FEATURED
                        </p>
                        <h3 className="truncate text-sm font-black text-white">
                          {banner.title}
                        </h3>
                        {banner.description && (
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-white/65">
                            {banner.description}
                          </p>
                        )}
                      </div>
                      {banner.buttonText && banner.destinationUrl && (
                        <a
                          href={banner.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg bg-emerald-400 px-2.5 py-2 text-[9px] font-black text-[#04110b]"
                        >
                          {banner.buttonText}
                        </a>
                      )}
                    </div>
                  </div>
                ) : null
              )}
            </div>

            {homeBanners.length > 1 && (
              <div className="mt-1 flex justify-center gap-1.5">
                {homeBanners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    aria-label={`Show banner ${index + 1}`}
                    aria-current={index === activeBannerIndex % homeBanners.length}
                    onClick={() => setActiveBannerIndex(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === activeBannerIndex % homeBanners.length
                        ? "w-5 bg-emerald-400"
                        : "w-1.5 bg-white/25"
                    }`}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Daily progress */}
        {(() => {
          const completedCount = tasks.filter((task) =>
            completedTaskIds.includes(task.id)
          ).length;
          const availableCount = tasks.length;
          const progress =
            availableCount > 0
              ? Math.round((completedCount / availableCount) * 100)
              : 0;

          return (
            <section className="glass-panel mt-3 rounded-[16px] px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold">Daily progress</p>
                  <p className="mt-0.5 text-[10px] text-white/40">
                    {completedCount}/{availableCount} tasks completed
                  </p>
                </div>

                <span className="shrink-0 text-xs font-black text-emerald-300">
                  {progress}%
                </span>
              </div>

              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>
          );
        })()}

        {/* Tasks */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-black">Tasks</h2>
            <span className="text-xs font-semibold text-white/40">
              Earn PP
            </span>
          </div>

          <div className="space-y-3">
            {tasksLoading ? (
              <div className="glass-panel rounded-[22px] p-5 text-center text-sm text-white/40">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="glass-panel rounded-[22px] p-5 text-center">
                <p className="font-bold">No tasks available</p>
                <p className="mt-1 text-xs text-white/40">
                  Check back soon for new opportunities.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  icon={
                    task.type === "watch_ads"
                      ? "▶️"
                      : task.type === "follow"
                        ? "📢"
                        : task.type === "join"
                          ? "✈️"
                          : task.type === "visit"
                            ? "🔗"
                            : "🎯"
                  }
                  title={task.title}
                  description={task.description ?? "Complete this task to earn PP"}
                  reward={`+${task.reward_pp} PP`}
                  onClick={
                    task.type === "watch_ads"
                      ? handleWatchAd
                      : undefined
                  }
                />
              ))
            )}
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
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  reward: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="task-card group flex w-full items-center gap-3 rounded-[18px] p-3 text-left"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/6 text-lg transition-transform duration-200 group-active:scale-90">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-bold">{title}</p>
        <p className="mt-1 truncate text-xs text-white/40">
          {description}
        </p>
      </div>

      <div className="shrink-0 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
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
