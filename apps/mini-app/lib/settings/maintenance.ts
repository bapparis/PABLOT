import { getPlatformSettings } from "@/lib/settings/platform";

export type MaintenanceFeature =
  | "newAccounts"
  | "tasks"
  | "watchAds"
  | "dailyCheckin"
  | "referrals"
  | "withdrawals"
  | "channelRequirement";

export async function isMaintenanceEnabled(
  feature?: MaintenanceFeature
): Promise<boolean> {
  const settings = await getPlatformSettings();

  if (settings.maintenanceMode || settings.maintenanceAllPlatform) {
    return true;
  }

  if (!feature) {
    return false;
  }

  switch (feature) {
    case "newAccounts":
      return settings.maintenanceNewAccounts;

    case "tasks":
      return settings.maintenanceTasks;

    case "watchAds":
      return settings.maintenanceWatchAds;

    case "dailyCheckin":
      return settings.maintenanceDailyCheckin;

    case "referrals":
      return settings.maintenanceReferrals;

    case "withdrawals":
      return settings.maintenanceWithdrawals;

    case "channelRequirement":
      return settings.maintenanceChannelRequirement;

    default:
      return false;
  }
}
