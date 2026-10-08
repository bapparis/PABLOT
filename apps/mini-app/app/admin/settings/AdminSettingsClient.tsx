"use client";

import { useEffect, useState } from "react";
import HomeBannerManager from "@/components/admin/HomeBannerManager";

type Settings = {
  maintenanceMode: boolean;
  maintenanceAllPlatform: boolean;
  maintenanceNewAccounts: boolean;
  maintenanceTasks: boolean;
  maintenanceWatchAds: boolean;
  maintenanceDailyCheckin: boolean;
  maintenanceReferrals: boolean;
  maintenanceWithdrawals: boolean;
  maintenanceChannelRequirement: boolean;

  referralQualificationDays: number;
  referralActiveRewardPp: number;
  referralMilestone1Enabled: boolean;
  referralMilestone1Count: number;
  referralMilestone1RewardPp: number;
  referralMilestone2Enabled: boolean;
  referralMilestone2Count: number;
  referralMilestone2RewardPp: number;
  referralMilestone3Enabled: boolean;
  referralMilestone3Count: number;
  referralMilestone3RewardPp: number;
  referralMilestone4Enabled: boolean;
  referralMilestone4Count: number;
  referralMilestone4RewardPp: number;
  referralMilestone5Enabled: boolean;
  referralMilestone5Count: number;
  referralMilestone5RewardPp: number;

  minimumWithdrawalPp: number;
  ppPerUsd: number;
  withdrawalFeeUsd: number;
  networkBscEnabled: boolean;
  networkTonEnabled: boolean;
  networkTrxEnabled: boolean;
  officialChannel: string;
  paymentsChannelId: string;
  paymentsChannelUsername: string;
  paymentsChannelEnabled: boolean;
  defaultLanguage: "en" | "fr";
  supportEnabled: boolean;
  supportTelegramUrl: string;
};

export default function AdminSettingsClient() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [draft, setDraft] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings");

        if (!response.ok) {
          throw new Error("Unable to load settings.");
        }

        const data = await response.json();

        setSettings(data.settings);
        setDraft(data.settings);
      } catch {
        setMessage("Unable to load settings.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateDraft<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current
    );
    setMessage("");
  }

  async function saveSettings() {
    if (!draft) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maintenance_mode: draft.maintenanceMode,
          maintenance_all_platform: draft.maintenanceAllPlatform,
          maintenance_new_accounts: draft.maintenanceNewAccounts,
          maintenance_tasks: draft.maintenanceTasks,
          maintenance_watch_ads: draft.maintenanceWatchAds,
          maintenance_daily_checkin: draft.maintenanceDailyCheckin,
          maintenance_referrals: draft.maintenanceReferrals,
          maintenance_withdrawals: draft.maintenanceWithdrawals,
          maintenance_channel_requirement:
            draft.maintenanceChannelRequirement,
          referral_qualification_days:
            draft.referralQualificationDays,
          referral_active_reward_pp:
            draft.referralActiveRewardPp,
          referral_milestone_1_enabled:
            draft.referralMilestone1Enabled,
          referral_milestone_1_count:
            draft.referralMilestone1Count,
          referral_milestone_1_reward_pp:
            draft.referralMilestone1RewardPp,
          referral_milestone_2_enabled:
            draft.referralMilestone2Enabled,
          referral_milestone_2_count:
            draft.referralMilestone2Count,
          referral_milestone_2_reward_pp:
            draft.referralMilestone2RewardPp,
          referral_milestone_3_enabled:
            draft.referralMilestone3Enabled,
          referral_milestone_3_count:
            draft.referralMilestone3Count,
          referral_milestone_3_reward_pp:
            draft.referralMilestone3RewardPp,
          referral_milestone_4_enabled:
            draft.referralMilestone4Enabled,
          referral_milestone_4_count:
            draft.referralMilestone4Count,
          referral_milestone_4_reward_pp:
            draft.referralMilestone4RewardPp,
          referral_milestone_5_enabled:
            draft.referralMilestone5Enabled,
          referral_milestone_5_count:
            draft.referralMilestone5Count,
          referral_milestone_5_reward_pp:
            draft.referralMilestone5RewardPp,
          minimum_withdrawal_pp: draft.minimumWithdrawalPp,
          pp_per_usd: draft.ppPerUsd,
          withdrawal_fee_usd: draft.withdrawalFeeUsd,
          network_bsc_enabled: draft.networkBscEnabled,
          network_ton_enabled: draft.networkTonEnabled,
          network_trx_enabled: draft.networkTrxEnabled,
          official_channel: draft.officialChannel,
          payments_channel_id: draft.paymentsChannelId,
          payments_channel_username: draft.paymentsChannelUsername,
          payments_channel_enabled: draft.paymentsChannelEnabled,
          default_language: draft.defaultLanguage,
          support_enabled: draft.supportEnabled,
          support_telegram_url: draft.supportTelegramUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save settings.");
      }

      setSettings(data.settings);
      setDraft(data.settings);
      setMessage("Settings saved successfully.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#050b11] p-5 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-[#163044] bg-[#08131d] p-6">
            <p className="text-sm text-[#91a8b8]">Loading settings…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!draft || !settings) {
    return (
      <main className="min-h-screen bg-[#050b11] p-5 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-red-500/20 bg-[#08131d] p-6">
            <p className="text-sm text-red-300">
              {message || "Unable to load settings."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050b11] p-4 text-white sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#59D9FF]">
            Platform configuration
          </p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black sm:text-3xl">
                Settings
              </h1>
              <p className="mt-1 text-sm text-[#91a8b8]">
                Control the core behavior of PABLOT.
              </p>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="min-h-11 rounded-xl bg-[#59D9FF] px-5 text-sm font-black text-[#031018] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {message && (
            <div
              className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                message.includes("successfully")
                  ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                  : "border-red-400/20 bg-red-400/10 text-red-300"
              }`}
              role="status"
            >
              {message}
            </div>
          )}
        </div>

        <HomeBannerManager />

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                  Maintenance
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Feature controls
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-[#91a8b8]">
                  Pause specific PABLOT features without taking the entire
                  platform offline.
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${
                  draft.maintenanceAllPlatform
                    ? "bg-amber-400/10 text-amber-300"
                    : "bg-emerald-400/10 text-emerald-300"
                }`}
              >
                {draft.maintenanceAllPlatform ? "Offline" : "Online"}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[
                [
                  "maintenanceAllPlatform",
                  "All Platform",
                  "Pause the entire PABLOT platform.",
                ],
                [
                  "maintenanceNewAccounts",
                  "New Accounts",
                  "Prevent new users from registering.",
                ],
                [
                  "maintenanceTasks",
                  "Tasks",
                  "Pause task participation and completion.",
                ],
                [
                  "maintenanceWatchAds",
                  "Watch Ads",
                  "Pause rewarded ad activity.",
                ],
                [
                  "maintenanceDailyCheckin",
                  "Daily Check-in",
                  "Pause daily check-in rewards.",
                ],
                [
                  "maintenanceReferrals",
                  "Referrals",
                  "Pause referral activity and rewards.",
                ],
                [
                  "maintenanceWithdrawals",
                  "Withdrawals",
                  "Prevent new withdrawal requests.",
                ],
                [
                  "maintenanceChannelRequirement",
                  "Channel Requirement",
                  "Pause the Telegram channel requirement.",
                ],
              ].map(([key, label, description]) => (
                <label
                  key={key}
                  className={`flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-2xl border p-4 ${
                    key === "maintenanceAllPlatform"
                      ? "border-amber-400/20 bg-amber-400/5"
                      : "border-[#163044] bg-[#0b1823]"
                  }`}
                >
                  <div>
                    <p className="text-sm font-black">{label}</p>
                    <p className="mt-1 text-xs text-[#91a8b8]">
                      {description}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={draft[key as keyof Settings] as boolean}
                    onChange={(event) =>
                      updateDraft(
                        key as keyof Settings,
                        event.target.checked as never
                      )
                    }
                    className="h-5 w-5 accent-[#59D9FF]"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Localization
            </p>
            <h2 className="mt-1 text-lg font-black">
              Language
            </h2>

            <label className="mt-5 block text-xs font-bold uppercase tracking-wider text-[#91a8b8]">
              Default language
              <select
                value={draft.defaultLanguage}
                onChange={(event) =>
                  updateDraft(
                    "defaultLanguage",
                    event.target.value === "fr" ? "fr" : "en"
                  )
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
              >
                <option value="en">English</option>
                <option value="fr">French</option>
              </select>
            </label>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5 lg:col-span-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
                Referrals
              </p>
              <h2 className="mt-1 text-lg font-black">
                Referral rewards
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-[#91a8b8]">
                Configure when referrals become active and how much PP is
                awarded for active referrals and milestones.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Qualification period (days)
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.referralQualificationDays}
                  onChange={(event) =>
                    updateDraft(
                      "referralQualificationDays",
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                />
                <span className="mt-1 block text-[11px] text-[#91a8b8]">
                  Consecutive active days required before the referral qualifies.
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Active referral reward (PP)
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.referralActiveRewardPp}
                  onChange={(event) =>
                    updateDraft(
                      "referralActiveRewardPp",
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                />
                <span className="mt-1 block text-[11px] text-[#91a8b8]">
                  One-time reward when a referred user becomes active.
                </span>
              </label>
            </div>

            <div className="mt-6">
              <div className="mb-3">
                <p className="text-sm font-black">Milestone rewards</p>
                <p className="mt-1 text-xs text-[#91a8b8]">
                  Reward the referrer as their number of active referrals grows.
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    number: 1,
                    enabled: "referralMilestone1Enabled",
                    count: "referralMilestone1Count",
                    reward: "referralMilestone1RewardPp",
                  },
                  {
                    number: 2,
                    enabled: "referralMilestone2Enabled",
                    count: "referralMilestone2Count",
                    reward: "referralMilestone2RewardPp",
                  },
                  {
                    number: 3,
                    enabled: "referralMilestone3Enabled",
                    count: "referralMilestone3Count",
                    reward: "referralMilestone3RewardPp",
                  },
                  {
                    number: 4,
                    enabled: "referralMilestone4Enabled",
                    count: "referralMilestone4Count",
                    reward: "referralMilestone4RewardPp",
                  },
                  {
                    number: 5,
                    enabled: "referralMilestone5Enabled",
                    count: "referralMilestone5Count",
                    reward: "referralMilestone5RewardPp",
                  },
                ].map((milestone) => (
                  <div
                    key={milestone.number}
                    className="grid gap-3 rounded-2xl border border-[#163044] bg-[#0b1823] p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
                  >
                    <label className="flex min-h-11 items-center gap-2 sm:pb-1">
                      <input
                        type="checkbox"
                        checked={
                          draft[
                            milestone.enabled as keyof Settings
                          ] as boolean
                        }
                        onChange={(event) =>
                          updateDraft(
                            milestone.enabled as keyof Settings,
                            event.target.checked as never
                          )
                        }
                        className="h-5 w-5 accent-[#59D9FF]"
                      />
                      <span className="text-sm font-black">
                        Milestone {milestone.number}
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#91a8b8]">
                        Active referrals
                      </span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={
                          draft[
                            milestone.count as keyof Settings
                          ] as number
                        }
                        onChange={(event) =>
                          updateDraft(
                            milestone.count as keyof Settings,
                            Number(event.target.value) as never
                          )
                        }
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#163044] bg-[#08131d] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#91a8b8]">
                        Reward (PP)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          draft[
                            milestone.reward as keyof Settings
                          ] as number
                        }
                        onChange={(event) =>
                          updateDraft(
                            milestone.reward as keyof Settings,
                            Number(event.target.value) as never
                          )
                        }
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#163044] bg-[#08131d] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                      />
                    </label>

                    <span
                      className={`rounded-full px-3 py-2 text-center text-[10px] font-black uppercase ${
                        draft[
                          milestone.enabled as keyof Settings
                        ]
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-white/5 text-white/35"
                      }`}
                    >
                      {draft[
                        milestone.enabled as keyof Settings
                      ]
                        ? "Enabled"
                        : "Disabled"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5 lg:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Withdrawals
            </p>
            <h2 className="mt-1 text-lg font-black">
              Financial rules
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Minimum withdrawal (PP)
                </span>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={draft.minimumWithdrawalPp}
                  onChange={(event) =>
                    updateDraft(
                      "minimumWithdrawalPp",
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  PP per USD
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.ppPerUsd}
                  onChange={(event) =>
                    updateDraft(
                      "ppPerUsd",
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Withdrawal fee (USD)
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.withdrawalFeeUsd}
                  onChange={(event) =>
                    updateDraft(
                      "withdrawalFeeUsd",
                      Number(event.target.value)
                    )
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none focus:border-[#59D9FF]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Networks
            </p>
            <h2 className="mt-1 text-lg font-black">
              Withdrawal networks
            </h2>

            <div className="mt-5 space-y-2">
              {[
                ["networkBscEnabled", "BSC", "BNB Smart Chain"],
                ["networkTonEnabled", "TON", "TON network"],
                ["networkTrxEnabled", "TRX", "TRON network"],
              ].map(([key, label, description]) => (
                <label
                  key={key}
                  className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#163044] bg-[#0b1823] px-4"
                >
                  <div>
                    <p className="text-sm font-black">{label}</p>
                    <p className="text-xs text-[#91a8b8]">
                      {description}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      draft[key as keyof Settings] as boolean
                    }
                    onChange={(event) =>
                      updateDraft(
                        key as keyof Settings,
                        event.target.checked as never
                      )
                    }
                    className="h-5 w-5 accent-[#59D9FF]"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Telegram
            </p>
            <h2 className="mt-1 text-lg font-black">
              Official channel
            </h2>

            <label className="mt-5 block">
              <span className="text-xs font-bold text-[#91a8b8]">
                Channel username or link
              </span>
              <input
                type="text"
                value={draft.officialChannel}
                onChange={(event) =>
                  updateDraft(
                    "officialChannel",
                    event.target.value
                  )
                }
                placeholder="@PABLOT or https://t.me/..."
                className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none placeholder:text-[#536b7b] focus:border-[#59D9FF]"
              />
            </label>

            <p className="mt-2 text-xs text-[#91a8b8]">
              Leave empty until the official channel is ready.
            </p>

            <div className="mt-6 border-t border-[#163044] pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#59D9FF]">
                    Payment proofs
                  </p>
                  <h3 className="mt-1 text-base font-black">
                    Payments channel
                  </h3>
                  <p className="mt-1 text-xs text-[#91a8b8]">
                    Controls automatic pending, paid, and rejected payment posts.
                  </p>
                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[#163044] bg-[#0b1823] px-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#91a8b8]">
                    Enabled
                  </span>
                  <input
                    type="checkbox"
                    checked={draft.paymentsChannelEnabled}
                    onChange={(event) =>
                      updateDraft(
                        "paymentsChannelEnabled",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 accent-[#59D9FF]"
                  />
                </label>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Channel username
                </span>
                <input
                  type="text"
                  value={draft.paymentsChannelUsername}
                  onChange={(event) =>
                    updateDraft(
                      "paymentsChannelUsername",
                      event.target.value
                    )
                  }
                  placeholder="@PABLOTPayments"
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none placeholder:text-[#536b7b] focus:border-[#59D9FF]"
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-bold text-[#91a8b8]">
                  Telegram channel ID
                </span>
                <input
                  type="text"
                  value={draft.paymentsChannelId}
                  onChange={(event) =>
                    updateDraft(
                      "paymentsChannelId",
                      event.target.value
                    )
                  }
                  placeholder="-1001234567890"
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none placeholder:text-[#536b7b] focus:border-[#59D9FF]"
                />
              </label>

              <p className="mt-2 text-xs leading-5 text-[#91a8b8]">
                The username is for admin reference. The channel ID is what the bot uses to publish payment proofs.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-[#163044] bg-[#08131d] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#59D9FF]">
              Support
            </p>
            <h2 className="mt-1 text-lg font-black">
              User support
            </h2>
            <p className="mt-1 text-xs text-[#91a8b8]">
              Configure where users go when they need help.
            </p>

            <label className="mt-5 flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[#163044] bg-[#0b1823] px-4">
              <div>
                <p className="text-sm font-black">Support enabled</p>
                <p className="text-xs text-[#91a8b8]">
                  Show the support option in the PABLOT app.
                </p>
              </div>

              <input
                type="checkbox"
                checked={draft.supportEnabled}
                onChange={(event) =>
                  updateDraft("supportEnabled", event.target.checked)
                }
                className="h-5 w-5 accent-[#59D9FF]"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-bold text-[#91a8b8]">
                Telegram support URL
              </span>
              <input
                type="url"
                value={draft.supportTelegramUrl}
                onChange={(event) =>
                  updateDraft("supportTelegramUrl", event.target.value)
                }
                placeholder="https://t.me/your_support"
                className="mt-2 min-h-12 w-full rounded-xl border border-[#163044] bg-[#0b1823] px-3 text-sm font-bold text-white outline-none placeholder:text-[#536b7b] focus:border-[#59D9FF]"
              />
            </label>
          </section>
        </div>
      </div>
    </main>
  );
}
