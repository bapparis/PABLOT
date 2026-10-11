import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
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

  const receivedHashBuffer = Buffer.from(hash, "hex");
  const calculatedHashBuffer = Buffer.from(
    calculatedHash,
    "hex"
  );

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

  if (
    !authDate ||
    Math.abs(Date.now() / 1000 - authDate) > 86400
  ) {
    return null;
  }

  const userRaw = params.get("user");

  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const initData =
      typeof body?.initData === "string" ? body.initData : "";
    const attemptId =
      typeof body?.attemptId === "string" ? body.attemptId : "";

    if (
      !initData ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        attemptId
      )
    ) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !supabaseKey) {
      console.error("AdsGram status endpoint configuration is incomplete.");
      return NextResponse.json(
        { error: "Service temporarily unavailable." },
        { status: 503 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData, botToken);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Invalid Telegram session." },
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramUser.id)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("watch_task_attempts")
      .select("id, status, confirmed_at, expires_at, consumed_at")
      .eq("id", attemptId)
      .eq("user_id", user.id)
      .eq("provider", "adsgram")
      .maybeSingle();

    if (attemptError) {
      console.error("AdsGram attempt lookup failed:", attemptError.message);
      return NextResponse.json(
        { error: "Could not check ad status." },
        { status: 500 }
      );
    }

    if (!attempt) {
      return NextResponse.json(
        { error: "Watch attempt not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        confirmed:
          attempt.status === "confirmed" ||
          Boolean(attempt.confirmed_at),
        status: attempt.status,
        consumed: Boolean(attempt.consumed_at),
        expiresAt: attempt.expires_at,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "AdsGram status endpoint error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
