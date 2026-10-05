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

    if (!initData || typeof initData !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "TELEGRAM_INIT_DATA_REQUIRED",
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

    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    const { data: attempt, error: attemptError } = await supabase
      .from("ad_attempts")
      .insert({
        user_id: user.id,
        telegram_id: user.telegram_id,
        provider: "adsgram",
        status: "pending",
        event_type: "watch_ad",
        expires_at: expiresAt,
        metadata: {
          source: "mini_app",
        },
      })
      .select(
        "id, provider, status, event_type, created_at, expires_at"
      )
      .single();

    if (attemptError) {
      if (attemptError.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            error: "AD_ATTEMPT_ALREADY_PENDING",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: "ATTEMPT_CREATE_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      attempt,
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
