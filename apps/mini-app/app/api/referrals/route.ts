import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function verifyTelegramInitData(
  initData: string,
  botToken: string
): { id: number } | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");

    if (!hash) return null;

    const authDate = Number(params.get("auth_date"));
    if (!authDate || Date.now() / 1000 - authDate > 86400) {
      return null;
    }

    const dataCheckString = [...params.entries()]
      .filter(([key]) => key !== "hash")
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const crypto = require("crypto");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (calculatedHash !== hash) return null;

    const userJson = params.get("user");
    if (!userJson) return null;

    const user = JSON.parse(userJson);

    if (!user?.id) return null;

    return { id: Number(user.id) };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (await isMaintenanceEnabled("referrals")) {
      return NextResponse.json(
        {
          error: "REFERRALS_MAINTENANCE",
        },
        { status: 503 }
      );
    }

    const initData = request.headers.get("x-telegram-init-data");
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!initData || !botToken) {
      return NextResponse.json(
        {
          error: "Telegram authentication required.",
        },
        { status: 401 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData, botToken);

    if (!telegramUser) {
      return NextResponse.json(
        {
          error: "Invalid Telegram authentication data.",
        },
        { status: 401 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, pablot_id, pp_balance")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "User account not found.",
        },
        { status: 404 }
      );
    }

    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select(
        `
          id,
          status,
          qualification_days,
          last_qualified_date,
          qualified_at,
          active_reward_pp,
          created_at,
          referred_user:users!referrals_referred_user_id_fkey(
            pablot_id,
            username,
            first_name,
            photo_url
          )
        `
      )
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (referralsError) {
      throw referralsError;
    }

    const referralList = referrals ?? [];

    // Refresh qualification for pending referrals before returning their status.
    for (const referral of referralList) {
      if (referral.status !== "pending") {
        continue;
      }

      const { error: qualificationError } = await supabase.rpc(
        "qualify_referral_and_reward",
        {
          p_referral_id: referral.id,
        }
      );

      if (qualificationError) {
        console.error(
          "Referral qualification refresh error:",
          qualificationError
        );
      }
    }

    // Reload referrals so the response contains the latest qualification state.
    const { data: refreshedReferrals, error: refreshError } =
      await supabase
        .from("referrals")
        .select(
          `
            id,
            status,
            qualification_days,
            last_qualified_date,
            qualified_at,
            active_reward_pp,
            created_at,
            referred_user:users!referrals_referred_user_id_fkey(
              pablot_id,
              username,
              first_name,
              photo_url
            )
          `
        )
        .eq("referrer_id", user.id)
        .order("created_at", { ascending: false });

    if (refreshError) {
      throw refreshError;
    }

    const latestReferralList = refreshedReferrals ?? [];

    const qualifiedCount = latestReferralList.filter(
      (referral) => referral.status === "qualified"
    ).length;

    const pendingCount = latestReferralList.filter(
      (referral) => referral.status === "pending"
    ).length;

    const totalRewardPp = latestReferralList.reduce(
      (total, referral) => total + (referral.active_reward_pp ?? 0),
      0
    );

    return NextResponse.json({
      user: {
        pablotId: user.pablot_id,
        ppBalance: user.pp_balance,
      },
      stats: {
        total: referralList.length,
        qualified: qualifiedCount,
        pending: pendingCount,
        rewardPp: totalRewardPp,
      },
      referrals: latestReferralList,
    });
  } catch (error) {
    console.error("Referral API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load referral data.",
      },
      { status: 500 }
    );
  }
}
