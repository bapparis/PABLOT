import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

function verifyTelegramInitData(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken || !initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash || !/^[a-f0-9]{64}$/i.test(receivedHash)) {
      return null;
    }

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const calculatedHash = createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    const received = Buffer.from(receivedHash, "hex");
    const calculated = Buffer.from(calculatedHash, "hex");

    if (
      received.length !== calculated.length ||
      !timingSafeEqual(received, calculated)
    ) {
      return null;
    }

    const authDate = Number(params.get("auth_date"));

    if (
      !Number.isFinite(authDate) ||
      Math.floor(Date.now() / 1000) - authDate > 86400
    ) {
      return null;
    }

    const userRaw = params.get("user");

    if (!userRaw) {
      return null;
    }

    const user = JSON.parse(userRaw);

    if (
      !Number.isSafeInteger(user.id) ||
      user.id <= 0
    ) {
      return null;
    }

    return {
      telegramId: user.id as number,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (await isMaintenanceEnabled("tasks")) {
      return NextResponse.json(
        {
          error:
            "Tasks are temporarily unavailable. Please try again later.",
          code: "TASKS_MAINTENANCE",
        },
        { status: 503 }
      );
    }

    const body = await request.json();

    const initData =
      typeof body?.initData === "string"
        ? body.initData
        : "";

    const attemptId =
      typeof body?.attemptId === "string"
        ? body.attemptId
        : "";

    if (!initData || !attemptId) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 }
      );
    }

    const telegramUser = verifyTelegramInitData(initData);

    if (!telegramUser) {
      return NextResponse.json(
        { error: "Invalid Telegram session." },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        {
          error:
            "Server configuration is incomplete.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const { data: user, error: userError } =
      await supabase
        .from("users")
        .select("id, telegram_id")
        .eq("telegram_id", telegramUser.telegramId)
        .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        {
          error: "PABLOT user not found.",
          code: "USER_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { data: result, error: rpcError } =
      await supabase.rpc(
        "complete_watch_task",
        {
          p_user_id: user.id,
          p_attempt_id: attemptId,
        }
      );

    if (rpcError) {
      const message = rpcError.message || "";

      if (
        message.includes("WATCH_ATTEMPT_NOT_CONFIRMED")
      ) {
        return NextResponse.json(
          {
            error:
              "The ad has not been confirmed yet.",
            code: "WATCH_NOT_CONFIRMED",
          },
          { status: 409 }
        );
      }

      if (
        message.includes("WATCH_ATTEMPT_EXPIRED")
      ) {
        return NextResponse.json(
          {
            error: "This ad attempt has expired.",
            code: "WATCH_ATTEMPT_EXPIRED",
          },
          { status: 409 }
        );
      }

      if (
        message.includes("WATCH_ATTEMPT_NOT_FOUND")
      ) {
        return NextResponse.json(
          {
            error: "Watch attempt not found.",
            code: "WATCH_ATTEMPT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Unable to complete Watch Ads task.",
        },
        { status: 500 }
      );
    }

    const row = Array.isArray(result)
      ? result[0]
      : result;

    if (!row) {
      return NextResponse.json(
        {
          error:
            "Unable to complete Watch Ads task.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: row.status,
      reward_pp: row.reward_pp,
      pp_balance: row.pp_balance,
      total_earned: row.total_earned,
      completion_id: row.completion_id,
      ads_completed: row.ads_completed,
      ads_required: row.ads_required,
      cooldown_seconds: row.cooldown_seconds,
      available_at: row.available_at,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
