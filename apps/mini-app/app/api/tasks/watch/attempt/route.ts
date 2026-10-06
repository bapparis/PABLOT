import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

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

    const initData = body?.initData;
    const taskId = body?.taskId;
    const providerAttemptId = body?.providerAttemptId ?? null;
    const ymid = body?.ymid ?? null;

    if (
      typeof initData !== "string" ||
      !initData ||
      typeof taskId !== "string" ||
      !taskId
    ) {
      return NextResponse.json(
        { error: "initData and taskId are required." },
        { status: 400 }
      );
    }

    if (
      providerAttemptId !== null &&
      typeof providerAttemptId !== "string"
    ) {
      return NextResponse.json(
        { error: "providerAttemptId must be a string or null." },
        { status: 400 }
      );
    }

    if (
      ymid !== null &&
      typeof ymid !== "string"
    ) {
      return NextResponse.json(
        { error: "ymid must be a string or null." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !botToken ||
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    if (!telegramUser?.id) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const { data: user, error: userError } =
      await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "PABLOT account not found." },
        { status: 404 }
      );
    }

    const { data: task, error: taskError } =
      await supabase
        .from("tasks")
        .select("id, type, active")
        .eq("id", taskId)
        .maybeSingle();

    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 500 }
      );
    }

    if (!task || !task.active) {
      return NextResponse.json(
        { error: "Task is not available." },
        { status: 404 }
      );
    }

    if (task.type !== "watch_ads") {
      return NextResponse.json(
        {
          error: "This task is not a Watch Ads task.",
          code: "INVALID_WATCH_TASK",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase.rpc(
      "create_watch_task_attempt",
      {
        p_user_id: user.id,
        p_task_id: taskId,
        p_telegram_id: telegramUser.id,
        p_provider_attempt_id: providerAttemptId,
        p_ymid: ymid,
        p_expires_at: expiresAt,
      }
    );

    if (error) {
      const message = error.message;

      if (
        message.includes("TASK_CONFIG_NOT_FOUND")
      ) {
        return NextResponse.json(
          {
            error: "Watch Ads configuration is incomplete.",
            code: "WATCH_TASK_CONFIG_MISSING",
          },
          { status: 500 }
        );
      }

      if (
        message.includes("TASK_NOT_IN_PROGRESS")
      ) {
        return NextResponse.json(
          {
            error: "Start the Watch Ads task first.",
            code: "WATCH_TASK_NOT_STARTED",
          },
          { status: 409 }
        );
      }

      if (
        message.includes("ATTEMPT_ALREADY_PENDING")
      ) {
        return NextResponse.json(
          {
            error: "A Watch Ads attempt is already active.",
            code: "WATCH_ATTEMPT_ACTIVE",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    if (!result) {
      return NextResponse.json(
        { error: "Unable to create Watch Ads attempt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      attempt_id: result.attempt_id,
      expires_at: result.expires_at,
      status: result.status,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
