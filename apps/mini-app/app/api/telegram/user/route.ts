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
    return {
      user: JSON.parse(userRaw),
      startParam: params.get("start_param") ?? null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = body?.initData;

    if (!initData || typeof initData !== "string") {
      return NextResponse.json(
        { error: "Telegram initData is required." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!botToken || !supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    const verifiedTelegramUser = telegramUser?.user;
    const referralStartParam = telegramUser?.startParam;

    if (!verifiedTelegramUser?.id || !verifiedTelegramUser.first_name) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const { data: existingUser, error: lookupError } = await supabase
      .from("users")
      .select(
        "id, telegram_id, pablot_id, username, first_name, last_name, photo_url, pp_balance, total_earned, language, notifications_enabled"
      )
      .eq("telegram_id", verifiedTelegramUser.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { error: lookupError.message },
        { status: 500 }
      );
    }

    if (existingUser) {
      const { data: updatedUser, error: updateError } = await supabase
        .from("users")
        .update({
          username: verifiedTelegramUser.username ?? null,
          first_name: verifiedTelegramUser.first_name,
          last_name: verifiedTelegramUser.last_name ?? null,
          photo_url: verifiedTelegramUser.photo_url ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("telegram_id", verifiedTelegramUser.id)
        .select(
          "id, telegram_id, pablot_id, username, first_name, last_name, photo_url, pp_balance, total_earned, language, notifications_enabled"
        )
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ user: updatedUser });
    }

    if (await isMaintenanceEnabled("newAccounts")) {
      return NextResponse.json(
        {
          error: "NEW_ACCOUNTS_MAINTENANCE",
        },
        { status: 503 }
      );
    }

    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        telegram_id: verifiedTelegramUser.id,
        username: verifiedTelegramUser.username ?? null,
        first_name: verifiedTelegramUser.first_name,
        last_name: verifiedTelegramUser.last_name ?? null,
        photo_url: verifiedTelegramUser.photo_url ?? null,
      })
      .select(
        "id, telegram_id, pablot_id, username, first_name, last_name, photo_url, pp_balance, total_earned, language, notifications_enabled"
      )
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    if (referralStartParam && referralStartParam !== newUser.pablot_id) {
      const { data: referrer } = await supabase
        .from("users")
        .select("id")
        .eq("pablot_id", referralStartParam)
        .maybeSingle();

      if (referrer && referrer.id !== newUser.id) {
        const { error: referralError } = await supabase
          .from("referrals")
          .insert({
            referrer_id: referrer.id,
            referred_user_id: newUser.id,
            status: "pending",
          });

        if (referralError && referralError.code !== "23505") {
          console.error("Referral attribution error:", referralError);
        }
      }
    }

    return NextResponse.json({ user: newUser });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
