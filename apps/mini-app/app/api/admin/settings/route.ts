import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";
import { getPlatformSettings } from "@/lib/settings/platform";

const ALLOWED_KEYS = new Set([
  "maintenance_mode",
  "maintenance_all_platform",
  "maintenance_new_accounts",
  "maintenance_tasks",
  "maintenance_watch_ads",
  "maintenance_daily_checkin",
  "maintenance_referrals",
  "maintenance_withdrawals",
  "maintenance_channel_requirement",
  "referral_qualification_days",
  "referral_active_reward_pp",
  "referral_milestone_1_enabled",
  "referral_milestone_1_count",
  "referral_milestone_1_reward_pp",
  "referral_milestone_2_enabled",
  "referral_milestone_2_count",
  "referral_milestone_2_reward_pp",
  "referral_milestone_3_enabled",
  "referral_milestone_3_count",
  "referral_milestone_3_reward_pp",
  "referral_milestone_4_enabled",
  "referral_milestone_4_count",
  "referral_milestone_4_reward_pp",
  "referral_milestone_5_enabled",
  "referral_milestone_5_count",
  "referral_milestone_5_reward_pp",
  "minimum_withdrawal_pp",
  "pp_per_usd",
  "withdrawal_fee_usd",
  "network_bsc_enabled",
  "network_ton_enabled",
  "network_trx_enabled",
  "official_channel",
  "payments_channel_id",
  "payments_channel_username",
  "payments_channel_enabled",
  "default_language",
]);

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET() {
  const allowed = await hasAdminPermission("manage_settings");

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const settings = await getPlatformSettings();

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Unable to load settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const allowed = await hasAdminPermission("manage_settings");

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Invalid settings payload." },
      { status: 400 }
    );
  }

  const entries = Object.entries(body);

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No settings supplied." },
      { status: 400 }
    );
  }

  for (const [key] of entries) {
    if (!ALLOWED_KEYS.has(key)) {
      return NextResponse.json(
        { error: `Unsupported setting: ${key}` },
        { status: 400 }
      );
    }
  }

  const updates = entries.map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  const supabase = getAdminSupabase();

  const { error } = await supabase
    .from("platform_settings")
    .upsert(updates, { onConflict: "key" });

  if (error) {
    return NextResponse.json(
      { error: "Unable to save settings." },
      { status: 500 }
    );
  }

  try {
    const settings = await getPlatformSettings();

    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { error: "Settings saved, but could not reload them." },
      { status: 500 }
    );
  }
}
