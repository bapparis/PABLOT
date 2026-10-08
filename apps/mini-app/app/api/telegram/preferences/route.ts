import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPPORTED_LANGUAGES = ["en", "fr", "ar", "hi"] as const;
type Language = (typeof SUPPORTED_LANGUAGES)[number];

function verifyTelegramInitData(initData: string, botToken: string) {
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

  if (
    !crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(hash, "hex")
    )
  ) {
    return null;
  }

  const userParam = params.get("user");
  if (!userParam) return null;

  try {
    return JSON.parse(userParam);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = body?.initData;
    const language = body?.language as Language;

    if (
      typeof initData !== "string" ||
      !SUPPORTED_LANGUAGES.includes(language)
    ) {
      return NextResponse.json(
        { error: "Invalid preferences." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    if (!botToken || !supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Preferences service is unavailable." },
        { status: 500 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData, botToken);

    if (!telegramUser?.id) {
      return NextResponse.json(
        { error: "Invalid Telegram session." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: user, error } = await supabase
      .from("users")
      .update({ language })
      .eq("telegram_id", telegramUser.id)
      .select("language")
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: "Unable to update your language." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      language: user.language,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update preferences." },
      { status: 500 }
    );
  }
}
