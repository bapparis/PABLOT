import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  return createClient(
    supabaseUrl,
    supabaseSecretKey
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const telegramId =
      request.nextUrl.searchParams.get("userid");

    if (!telegramId) {
      return NextResponse.json(
        { error: "userid is required." },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(telegramId)) {
      return NextResponse.json(
        { error: "Invalid userid." },
        { status: 400 }
      );
    }

    const telegramUserId = Number(telegramId);

    if (!Number.isSafeInteger(telegramUserId)) {
      return NextResponse.json(
        { error: "Invalid userid." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "confirm_adsgram_watch_attempt",
      {
        p_telegram_id: telegramUserId,
      }
    );

    if (error) {
      const message = error.message;

      if (message.includes("WATCH_USER_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "PABLOT account not found.",
            code: "WATCH_USER_NOT_FOUND",
          },
          { status: 404 }
        );
      }

      if (message.includes("WATCH_ATTEMPT_NOT_FOUND")) {
        return NextResponse.json(
          {
            error: "No active AdsGram Watch Ads attempt found.",
            code: "WATCH_ATTEMPT_NOT_FOUND",
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
            error: "Watch Ads attempt was already processed.",
            code: "WATCH_ATTEMPT_ALREADY_PROCESSED",
          },
          { status: 409 }
        );
      }

      console.error(
        "AdsGram Watch Ads confirmation RPC error:",
        error
      );

      return NextResponse.json(
        {
          error: "Unable to confirm Watch Ads attempt.",
          code: "WATCH_CONFIRMATION_FAILED",
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
          error: "Watch Ads confirmation was not created.",
          code: "WATCH_CONFIRMATION_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
    });
  } catch (error) {
    console.error(
      "AdsGram Watch Ads reward endpoint error:",
      error
    );

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
