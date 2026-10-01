import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

interface TelegramUser {
  id: number;
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

export async function GET(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const telegramUser = verifyTelegramInitData(
    initData,
    botToken
  );

  if (!telegramUser) {
    return NextResponse.json(
      { error: "INVALID_TELEGRAM_DATA" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  const { data: check, error: checkError } = await supabase
    .from("daily_ad_checks")
    .select("ads_completed, reward_claimed")
    .eq("user_id", user.id)
    .eq("check_date", new Date().toISOString().slice(0, 10))
    .maybeSingle();

  if (checkError) {
    return NextResponse.json(
      { error: "CHECK_LOOKUP_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ads_completed: check?.ads_completed ?? 0,
    reward_claimed: check?.reward_claimed ?? false,
  });
}


export async function POST(request: NextRequest) {
  const initData = request.headers.get("x-telegram-init-data");
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!initData || !botToken) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const telegramUser = verifyTelegramInitData(
    initData,
    botToken
  );

  if (!telegramUser) {
    return NextResponse.json(
      { error: "INVALID_TELEGRAM_DATA" },
      { status: 401 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (userError || !user) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase.rpc(
    "claim_daily_ad_reward",
    {
      p_user_id: user.id,
    }
  );

  if (error) {
    console.error("Daily Check claim error:", error);

    return NextResponse.json(
      { error: "DAILY_CHECK_CLAIM_FAILED" },
      { status: 500 }
    );
  }

  const result = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({
    ads_completed: result?.ads_completed ?? 0,
    reward_granted: result?.reward_granted ?? false,
    pp_balance: result?.pp_balance ?? 0,
    total_earned: result?.total_earned ?? 0,
    status: result?.status ?? "PENDING",
  });
}
