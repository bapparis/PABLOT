import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";
import { sendReferralQualifiedNotification } from "@/lib/telegram/referral";

interface TelegramUser {
  id: number;
  username?: string;
}

function verifyTelegramInitData(
  initData: string,
  botToken: string
): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) return null;

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (hash !== calculatedHash) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return { error: "UNAUTHORIZED", status: 401 as const };
  }

  const telegramUser = verifyTelegramInitData(initData, botToken);

  if (!telegramUser) {
    return { error: "INVALID_TELEGRAM_DATA", status: 401 as const };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (error || !user) {
    return { error: "USER_NOT_FOUND", status: 404 as const };
  }

  return { supabase, user, telegramUser };
}

export async function GET(request: NextRequest) {
  if (await isMaintenanceEnabled("dailyCheckin")) {
    return NextResponse.json(
      {
        error: "DAILY_CHECKIN_MAINTENANCE",
      },
      { status: 503 }
    );
  }

  const auth = await getAuthenticatedUser(request);

  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user, telegramUser } = auth;

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: check, error: checkError }, { data: adCheck, error: adError }] =
    await Promise.all([
      supabase
        .from("daily_checkins")
        .select(
          "streak_day, treasure_unlocked, treasure_claimed"
        )
        .eq("user_id", user.id)
        .eq("check_date", today)
        .maybeSingle(),

      supabase
        .from("daily_ad_checks")
        .select("ads_completed")
        .eq("user_id", user.id)
        .eq("check_date", today)
        .maybeSingle(),
    ]);

  if (checkError || adError) {
    return NextResponse.json(
      { error: "CHECK_LOOKUP_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    streak_day: check?.streak_day ?? 0,
    ads_completed: Math.min(adCheck?.ads_completed ?? 0, 3),
    checked_in_today: Boolean(check),
    treasure_unlocked: check?.treasure_unlocked ?? false,
    treasure_claimed: check?.treasure_claimed ?? false,
  });
}

export async function POST(request: NextRequest) {
  if (await isMaintenanceEnabled("dailyCheckin")) {
    return NextResponse.json(
      {
        error: "DAILY_CHECKIN_MAINTENANCE",
      },
      { status: 503 }
    );
  }

  const auth = await getAuthenticatedUser(request);

  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user, telegramUser } = auth;

  const { data, error } = await supabase.rpc(
    "complete_daily_checkin",
    {
      p_user_id: user.id,
    }
  );

  if (error) {
    console.error("Daily Check-in error:", error);

    return NextResponse.json(
      { error: "DAILY_CHECKIN_FAILED" },
      { status: 500 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  // Check whether this user was referred and update qualification progress.
  const { data: referral } = await supabase
    .from("referrals")
    .select("id, status, referrer_id")
    .eq("referred_user_id", user.id)
    .maybeSingle();

  if (referral && referral.status === "pending") {
    const { data: qualificationResult, error: qualificationError } =
      await supabase.rpc("qualify_referral_and_reward", {
        p_referral_id: referral.id,
      });

    if (qualificationError) {
      console.error(
        "Referral qualification error:",
        qualificationError
      );
    } else {
      const qualification = Array.isArray(qualificationResult)
        ? qualificationResult[0]
        : qualificationResult;

      const rewardPp = Number(qualification?.reward_pp ?? 0);

      if (rewardPp > 0) {
        const { data: referrer } = await supabase
          .from("users")
          .select("telegram_id")
          .eq("id", referral.referrer_id)
          .maybeSingle();

        const botToken = process.env.TELEGRAM_BOT_TOKEN;

        if (referrer?.telegram_id && botToken) {
          await sendReferralQualifiedNotification(
            botToken,
            referrer.telegram_id,
            telegramUser.username ?? null,
            rewardPp
          );
        }
      }
    }
  }

  return NextResponse.json({
    streak_day: result?.streak_day ?? 0,
    checked_in_today:
      result?.checked_in_today ?? false,
    treasure_unlocked:
      result?.treasure_unlocked ?? false,
    treasure_claimed:
      result?.treasure_claimed ?? false,
  });
}
