import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function secretMatches(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function GET(request: NextRequest) {
  try {
    const expectedSecret = process.env.ADSGRAM_REWARD_SECRET;
    const params = request.nextUrl.searchParams;
    const receivedSecret = params.get("secret") ?? "";

    if (!expectedSecret) {
      console.error("AdsGram reward secret is not configured.");

      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 503 }
      );
    }

    if (!receivedSecret || !secretMatches(receivedSecret, expectedSecret)) {
      return NextResponse.json(
        { error: "Unauthorized callback." },
        { status: 401 }
      );
    }

    const telegramId = params.get("userid");

    if (!telegramId || !/^\d+$/.test(telegramId)) {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("AdsGram Supabase configuration is incomplete.");

      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc(
      "confirm_adsgram_watch_attempt",
      {
        p_telegram_id: telegramUserId,
      }
    );

    if (error) {
      const message = error.message;

      if (
        message.includes("WATCH_USER_NOT_FOUND") ||
        message.includes("WATCH_ATTEMPT_NOT_FOUND")
      ) {
        return NextResponse.json(
          { error: "No matching Watch Ads attempt found." },
          { status: 404 }
        );
      }

      if (message.includes("WATCH_ATTEMPT_ALREADY_PROCESSED")) {
        return NextResponse.json(
          { error: "Watch Ads attempt was already processed." },
          { status: 409 }
        );
      }

      console.error(
        "AdsGram confirmation RPC failed:",
        error.message
      );

      return NextResponse.json(
        { error: "Unable to confirm Watch Ads attempt." },
        { status: 500 }
      );
    }

    const confirmation = Array.isArray(data) ? data[0] : data;

    if (!confirmation) {
      return NextResponse.json(
        { error: "Watch Ads confirmation was not created." },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      confirmed: true,
    });
  } catch (error) {
    console.error(
      "AdsGram callback failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
