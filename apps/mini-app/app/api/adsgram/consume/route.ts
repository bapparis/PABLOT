import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return null;
  }

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

  const calculatedHashBuffer = Buffer.from(calculatedHash, "hex");
  const receivedHashBuffer = Buffer.from(hash, "hex");

  if (
    receivedHashBuffer.length !== calculatedHashBuffer.length ||
    !crypto.timingSafeEqual(
      calculatedHashBuffer,
      receivedHashBuffer
    )
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));

  if (!authDate || Date.now() / 1000 - authDate > 86400) {
    return null;
  }

  const userRaw = params.get("user");

  if (!userRaw) {
    return null;
  }

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (await isMaintenanceEnabled("watchAds")) {
      return NextResponse.json(
        {
          ok: false,
          error: "WATCH_ADS_MAINTENANCE",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const initData = body?.initData;
    const attemptId = body?.attemptId;

    if (
      !initData ||
      typeof initData !== "string" ||
      !attemptId ||
      typeof attemptId !== "string"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_REQUEST",
        },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!botToken || !supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "SERVER_CONFIGURATION_ERROR",
        },
        { status: 500 }
      );
    }

    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    if (!telegramUser?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_TELEGRAM_AUTH",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const telegramId = Number(telegramUser.id);

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, telegram_id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    if (userError) {
      return NextResponse.json(
        {
          ok: false,
          error: "USER_LOOKUP_FAILED",
        },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("ad_attempts")
      .select("id, user_id, provider, status")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (attemptError) {
      return NextResponse.json(
        {
          ok: false,
          error: "ATTEMPT_LOOKUP_FAILED",
        },
        { status: 500 }
      );
    }

    if (!attempt) {
      return NextResponse.json(
        {
          ok: false,
          error: "ATTEMPT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (attempt.provider !== "adsgram") {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_AD_PROVIDER",
        },
        { status: 400 }
      );
    }

    if (
      attempt.status !== "confirmed" &&
      attempt.status !== "consumed"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "AD_NOT_CONFIRMED",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase.rpc(
      "consume_watch_ad_attempt",
      {
        p_attempt_id: attempt.id,
      }
    );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "CONSUME_FAILED",
        },
        { status: 500 }
      );
    }

    const result = Array.isArray(data) ? data[0] : null;

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          error: "CONSUME_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attemptId: result.attempt_id,
      status: result.status,
      rewardPp: result.reward_pp,
      ppBalance: result.pp_balance,
      totalEarned: result.total_earned,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "INVALID_REQUEST",
      },
      { status: 400 }
    );
  }
}
