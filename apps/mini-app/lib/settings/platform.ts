import { createClient } from "@supabase/supabase-js";

export type PlatformSettings = {
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

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

function readBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function readNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key,value");

  if (error) {
    throw new Error("Unable to load platform settings.");
  }

  const settings = Object.fromEntries(
    (data ?? []).map((item) => [item.key, item.value])
  );

  const defaultLanguage =
    settings.default_language === "fr" ? "fr" : "en";

  return {
    maintenanceMode: readBoolean(settings.maintenance_mode, false),
    maintenanceAllPlatform: readBoolean(
      settings.maintenance_all_platform,
      false
    ),
    maintenanceNewAccounts: readBoolean(
      settings.maintenance_new_accounts,
      false
    ),
    maintenanceTasks: readBoolean(
      settings.maintenance_tasks,
      false
    ),
    maintenanceWatchAds: readBoolean(
      settings.maintenance_watch_ads,
      false
    ),
    maintenanceDailyCheckin: readBoolean(
      settings.maintenance_daily_checkin,
      false
    ),
    maintenanceReferrals: readBoolean(
      settings.maintenance_referrals,
      false
    ),
    maintenanceWithdrawals: readBoolean(
      settings.maintenance_withdrawals,
      false
    ),
    maintenanceChannelRequirement: readBoolean(
      settings.maintenance_channel_requirement,
      false
    ),
    referralQualificationDays: readNumber(
      settings.referral_qualification_days,
      3
    ),
    referralActiveRewardPp: readNumber(
      settings.referral_active_reward_pp,
      2500
    ),
    referralMilestone1Enabled: readBoolean(
      settings.referral_milestone_1_enabled,
      true
    ),
    referralMilestone1Count: readNumber(
      settings.referral_milestone_1_count,
      1
    ),
    referralMilestone1RewardPp: readNumber(
      settings.referral_milestone_1_reward_pp,
      500
    ),
    referralMilestone2Enabled: readBoolean(
      settings.referral_milestone_2_enabled,
      true
    ),
    referralMilestone2Count: readNumber(
      settings.referral_milestone_2_count,
      5
    ),
    referralMilestone2RewardPp: readNumber(
      settings.referral_milestone_2_reward_pp,
      2500
    ),
    referralMilestone3Enabled: readBoolean(
      settings.referral_milestone_3_enabled,
      true
    ),
    referralMilestone3Count: readNumber(
      settings.referral_milestone_3_count,
      10
    ),
    referralMilestone3RewardPp: readNumber(
      settings.referral_milestone_3_reward_pp,
      5000
    ),
    referralMilestone4Enabled: readBoolean(
      settings.referral_milestone_4_enabled,
      true
    ),
    referralMilestone4Count: readNumber(
      settings.referral_milestone_4_count,
      25
    ),
    referralMilestone4RewardPp: readNumber(
      settings.referral_milestone_4_reward_pp,
      15000
    ),
    referralMilestone5Enabled: readBoolean(
      settings.referral_milestone_5_enabled,
      true
    ),
    referralMilestone5Count: readNumber(
      settings.referral_milestone_5_count,
      50
    ),
    referralMilestone5RewardPp: readNumber(
      settings.referral_milestone_5_reward_pp,
      25000
    ),
    minimumWithdrawalPp: readNumber(
      settings.minimum_withdrawal_pp,
      5000
    ),
    ppPerUsd: readNumber(settings.pp_per_usd, 1000),
    withdrawalFeeUsd: readNumber(
      settings.withdrawal_fee_usd,
      1
    ),
    networkBscEnabled: readBoolean(
      settings.network_bsc_enabled,
      true
    ),
    networkTonEnabled: readBoolean(
      settings.network_ton_enabled,
      false
    ),
    networkTrxEnabled: readBoolean(
      settings.network_trx_enabled,
      false
    ),
    officialChannel: readString(
      settings.official_channel,
      ""
    ),
    paymentsChannelId: readString(
      settings.payments_channel_id,
      ""
    ),
    paymentsChannelUsername: readString(
      settings.payments_channel_username,
      ""
    ),
    paymentsChannelEnabled: readBoolean(
      settings.payments_channel_enabled,
      false
    ),
    defaultLanguage,
    supportEnabled: readBoolean(settings.support_enabled, true),
    supportTelegramUrl: readString(settings.support_telegram_url, ""),
  };
}
