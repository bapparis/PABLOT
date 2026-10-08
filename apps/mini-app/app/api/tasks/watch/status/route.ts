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

    if (typeof initData !== "string" || !initData) {
      return NextResponse.json(
        { error: "initData is required." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;
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

    const { data: cycles, error: cyclesError } =
      await supabase
        .from("watch_task_cycles")
        .select(
          "task_id, status, ads_completed, available_at"
        )
        .eq("user_id", user.id);

    if (cyclesError) {
      return NextResponse.json(
        { error: cyclesError.message },
        { status: 500 }
      );
    }

    const cycleMap: Record<
      string,
      {
        status: string;
        ads_completed: number;
        available_at: string | null;
      }
    > = {};

    for (const cycle of cycles ?? []) {
      cycleMap[cycle.task_id] = {
        status: cycle.status,
        ads_completed: Number(
          cycle.ads_completed ?? 0
        ),
        available_at: cycle.available_at ?? null,
      };
    }

    return NextResponse.json({
      success: true,
      cycles: cycleMap,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
