"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";

interface ReferralUser {
  pablot_id: string | null;
  username: string | null;
  first_name: string;
  photo_url: string | null;
}

interface Referral {
  id: string;
  status: "pending" | "qualified" | "cancelled";
  qualification_days: number;
  last_qualified_date: string | null;
  qualified_at: string | null;
  active_reward_pp: number;
  created_at: string;
  referred_user: ReferralUser | null;
}

interface ReferralResponse {
  user: {
    pablotId: string | null;
    ppBalance: number;
  };
  stats: {
    total: number;
    qualified: number;
    pending: number;
    rewardPp: number;
  };
  referrals: Referral[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReferrals = async () => {
      try {
        const initData = window.Telegram?.WebApp?.initData;

        if (!initData) {
          setError("Open PABLOT from Telegram to view referrals.");
          return;
        }

        const response = await fetch("/api/referrals", {
          headers: {
            "x-telegram-init-data": initData,
          },
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          setError(
            result?.error === "REFERRALS_MAINTENANCE"
              ? "Referrals are temporarily unavailable."
              : result?.error || "Unable to load referrals."
          );
          return;
        }

        setData(result);
      } catch {
        setError("Unable to load referral data.");
      } finally {
        setLoading(false);
      }
    };

    loadReferrals();
  }, []);

  const stats = data?.stats ?? {
    total: 0,
    qualified: 0,
    pending: 0,
    rewardPp: 0,
  };

  const getReferralUrl = async () => {
    const pablotId = data?.user.pablotId;

    if (!pablotId) {
      throw new Error("PABLOT_ID_MISSING");
    }

    const response = await fetch("/api/telegram/bot-info", {
      cache: "no-store",
    });

    const bot = await response.json();

    if (!response.ok || !bot?.username) {
      throw new Error("BOT_INFO_FAILED");
    }

    return `https://t.me/${bot.username}?start=${encodeURIComponent(
      pablotId
    )}`;
  };

  const handleInvite = async () => {
    try {
      const referralUrl = await getReferralUrl();

      const shareText =
        "🚀 Join me on PABLOT and earn PP by completing tasks!";

      const shareUrl =
        `https://t.me/share/url?url=${encodeURIComponent(
          referralUrl
        )}&text=${encodeURIComponent(shareText)}`;

      window.open(shareUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Unable to create your referral link.");
    }
  };

  const handleCopyReferral = async () => {
    try {
      const referralUrl = await getReferralUrl();

      if (!navigator.clipboard) {
        setError("Copy is not available on this device.");
        return;
      }

      await navigator.clipboard.writeText(referralUrl);

      setError("Referral link copied ✓");

      window.setTimeout(() => {
        setError("");
      }, 1800);
    } catch {
      setError("Unable to copy your referral link.");
    }
  };

  return (
    <main className="min-h-screen px-4 pb-24 pt-4">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-4">
          <p className="text-[10px] font-bold tracking-[0.16em] text-white/40">
            GROW WITH PABLOT
          </p>

          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Referrals
              </h1>

              <p className="mt-1 text-xs text-white/40">
                Invite friends. Earn when they become active.
              </p>
            </div>

            <div className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                Balance
              </p>
              <p className="text-sm font-black text-emerald-300">
                {data?.user.ppBalance?.toLocaleString() ?? "—"} PP
              </p>
            </div>
          </div>
        </header>

        <section className="rounded-[20px] border border-emerald-300/10 bg-emerald-300/[0.06] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-300/10 text-xl">
              🎁
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                Referral earnings
              </p>

              <p className="mt-0.5 text-2xl font-black">
                {stats.rewardPp.toLocaleString()}
                <span className="ml-1 text-xs text-emerald-300">
                  PP
                </span>
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyReferral}
                disabled={!data?.user.pablotId}
                aria-label="Copy referral link"
                title="Copy referral link"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/7 text-base transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ⧉
              </button>

              <button
                type="button"
                onClick={handleInvite}
                disabled={!data?.user.pablotId}
                className="rounded-xl bg-emerald-300 px-3.5 py-2.5 text-xs font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Invite
              </button>
            </div>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">
            <p className="text-[10px] text-white/35">Total</p>
            <p className="mt-1 text-lg font-black">
              {stats.total}
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">
            <p className="text-[10px] text-white/35">Qualified</p>
            <p className="mt-1 text-lg font-black text-emerald-300">
              {stats.qualified}
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.045] px-3 py-3">
            <p className="text-[10px] text-white/35">Pending</p>
            <p className="mt-1 text-lg font-black">
              {stats.pending}
            </p>
          </div>
        </section>

        <section className="mt-3 rounded-[20px] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black">
                Your referrals
              </p>

              <p className="mt-0.5 text-[10px] text-white/35">
                3 qualifying days • 10 tasks each day
              </p>
            </div>

            <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-white/45">
              {stats.qualified}/{stats.total}
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-xl bg-white/[0.03] px-3 py-4 text-center text-xs text-white/35">
              Loading referrals…
            </div>
          ) : error ? (
            <div className="mt-4 rounded-xl border border-red-400/10 bg-red-400/[0.05] px-3 py-4 text-center text-xs text-red-200/70">
              {error}
            </div>
          ) : data?.referrals.length ? (
            <div className="mt-3 space-y-2">
              {data.referrals.map((referral) => {
                const referredUser = referral.referred_user;
                const days = Math.min(
                  referral.qualification_days,
                  3
                );
                const progress = (days / 3) * 100;

                return (
                  <div
                    key={referral.id}
                    className="rounded-2xl bg-white/[0.035] px-3 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {referredUser?.photo_url ? (
                        <img
                          src={referredUser.photo_url}
                          alt=""
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black">
                          {referredUser?.first_name
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-black">
                          {referredUser?.first_name ||
                            "PABLOT User"}
                        </p>

                        <p className="truncate text-[10px] text-white/35">
                          {referredUser?.username
                            ? `@${referredUser.username}`
                            : referredUser?.pablot_id ||
                              "PABLOT member"}
                        </p>
                      </div>

                      <span
                        className={`rounded-lg px-2 py-1 text-[9px] font-black ${
                          referral.status === "qualified"
                            ? "bg-emerald-300/10 text-emerald-300"
                            : "bg-white/5 text-white/45"
                        }`}
                      >
                        {referral.status === "qualified"
                          ? "QUALIFIED"
                          : `${days}/3 DAYS`}
                      </span>
                    </div>

                    {referral.status !== "qualified" && (
                      <div className="mt-3">
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-emerald-300 transition-all"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>

                        <p className="mt-1.5 text-[9px] text-white/30">
                          Each day requires check-in + 10 completed tasks.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-white/[0.025] px-3 py-5 text-center">
              <p className="text-sm font-bold text-white/60">
                No referrals yet
              </p>

              <p className="mt-1 text-[10px] text-white/30">
                Invite your first friend to start earning.
              </p>
            </div>
          )}
        </section>

        <section className="mt-3 rounded-[20px] bg-white/[0.035] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black">
                Referral milestones
              </p>

              <p className="mt-0.5 text-[10px] text-white/35">
                More qualified referrals unlock more rewards.
              </p>
            </div>

            <span className="text-lg">🏆</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.035] px-3 py-2.5">
              <p className="text-[10px] text-white/35">
                Qualified
              </p>
              <p className="mt-0.5 text-sm font-black">
                {stats.qualified}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-300/[0.06] px-3 py-2.5">
              <p className="text-[10px] text-white/35">
                Earned
              </p>
              <p className="mt-0.5 text-sm font-black text-emerald-300">
                {stats.rewardPp.toLocaleString()} PP
              </p>
            </div>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
