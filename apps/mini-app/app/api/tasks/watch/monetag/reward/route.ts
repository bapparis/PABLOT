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

export async function GET(request: NextRequest) {
  try {
    if (await isMaintenanceEnabled("watchAds")) {
      return NextResponse.json(
        {
          confirmed: false,
          error: "WATCH_ADS_MAINTENANCE",
        },
        { status: 503 }
      );
    }

    const initData =
      request.nextUrl.searchParams.get("initData");

    const ymid =
      request.nextUrl.searchParams.get("ymid");

    if (!initData) {
      return NextResponse.json(
        { confirmed: false, error: "INIT_DATA_REQUIRED" },
        { status: 400 }
      );
    }

    if (!ymid) {
      return NextResponse.json(
        { confirmed: false, error: "YMID_REQUIRED" },
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
        {
          confirmed: false,
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
          confirmed: false,
          error: "INVALID_TELEGRAM_AUTH",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const { data, error } = await supabase.rpc(
      "confirm_monetag_watch_attempt",
      {
        p_telegram_id: telegramUser.id,
        p_ymid: ymid,
      }
    );

    if (error) {
      const message = error.message;

      if (
        message.includes(
          "WATCH_MONETAG_CONFIRMATION_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            confirmed: false,
            pending: true,
            code: "WATCH_MONETAG_CONFIRMATION_PENDING",
          },
          { status: 202 }
        );
      }

      if (
        message.includes(
          "WATCH_MONETAG_ATTEMPT_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          {
            confirmed: false,
            error:
              "No active Monetag Watch Ads attempt found.",
            code: "WATCH_MONETAG_ATTEMPT_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (
        message.includes(
          "WATCH_ATTEMPT_ALREADY_PROCESSED"
        )
      ) {
        return NextResponse.json(
          {
            confirmed: true,
            already_processed: true,
          }
        );
      }

      console.error(
        "Monetag Watch Ads confirmation RPC error:",
        error
      );

      return NextResponse.json(
        {
          confirmed: false,
          error:
            "Unable to confirm Monetag Watch Ads attempt.",
          code: "WATCH_MONETAG_CONFIRMATION_FAILED",
        },
        { status: 500 }
      );
    }

    const confirmation = Array.isArray(data)
      ? data[0]
      : data;

    if (!confirmation) {
      return NextResponse.json(
        {
          confirmed: false,
          error: "Watch Ads confirmation was not created.",
          code: "WATCH_MONETAG_CONFIRMATION_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
      attempt_id: confirmation.attempt_id,
    });
  } catch (error) {
    console.error(
      "Monetag Watch Ads confirmation endpoint error:",
      error
    );

    return NextResponse.json(
      {
        confirmed: false,
        error: "Invalid request.",
      },
      { status: 400 }
    );
  }
}
