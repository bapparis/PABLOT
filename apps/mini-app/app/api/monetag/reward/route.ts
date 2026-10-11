import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

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
    const expectedSecret = process.env.MONETAG_POSTBACK_SECRET;
    const params = request.nextUrl.searchParams;
    const receivedSecret = params.get("secret") ?? "";

    if (!expectedSecret) {
      console.error("Monetag postback secret is not configured.");
      return NextResponse.json(
        { ok: false, error: "SERVER_CONFIGURATION_ERROR" },
        { status: 503 }
      );
    }

    if (!receivedSecret || !secretMatches(receivedSecret, expectedSecret)) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (await isMaintenanceEnabled("watchAds")) {
      return NextResponse.json(
        { ok: false, error: "WATCH_ADS_MAINTENANCE" },
        { status: 503 }
      );
    }

    const telegramId =
      params.get("telegram_id") ??
      params.get("telegramId") ??
      params.get("telegramid");

    const rewardEventType =
      params.get("reward_event_type") ??
      params.get("rewardEventType");

    const eventType =
      params.get("event_type") ??
      params.get("eventType");

    const ymid = params.get("ymid");

    if (!telegramId || !/^\d+$/.test(telegramId)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_TELEGRAM_ID" },
        { status: 400 }
      );
    }

    if (rewardEventType !== "valued") {
      return NextResponse.json(
        { ok: false, error: "NOT_A_REWARDED_EVENT" },
        { status: 400 }
      );
    }

    if (eventType !== "impression") {
      return NextResponse.json(
        { ok: false, error: "INVALID_EVENT_TYPE" },
        { status: 400 }
      );
    }

    if (!ymid || ymid.length > 255) {
      return NextResponse.json(
        { ok: false, error: "MISSING_OR_INVALID_YMID" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error("Monetag Supabase configuration is incomplete.");
      return NextResponse.json(
        { ok: false, error: "SERVER_CONFIGURATION_ERROR" },
        { status: 503 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const telegramIdNumber = Number(telegramId);

    if (!Number.isSafeInteger(telegramIdNumber)) {
      return NextResponse.json(
        { ok: false, error: "INVALID_TELEGRAM_ID" },
        { status: 400 }
      );
    }

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("telegram_id", telegramIdNumber)
      .maybeSingle();

    if (userError) {
      console.error("Monetag user lookup failed:", userError.message);
      return NextResponse.json(
        { ok: false, error: "USER_LOOKUP_FAILED" },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    const estimatedPriceRaw = params.get("estimated_price");
    const estimatedPrice = estimatedPriceRaw
      ? Number(estimatedPriceRaw)
      : null;

    const { error: confirmationError } = await supabase
      .from("monetag_reward_confirmations")
      .insert({
        user_id: user.id,
        telegram_id: telegramIdNumber,
        ymid,
        event_type: eventType,
        reward_event_type: rewardEventType,
        estimated_price:
          estimatedPrice !== null &&
          Number.isFinite(estimatedPrice) &&
          estimatedPrice >= 0
            ? estimatedPrice
            : null,
      });

    if (confirmationError) {
      console.error(
        "Monetag reward confirmation save failed:",
        confirmationError.message
      );

      return NextResponse.json(
        { ok: false, error: "CONFIRMATION_SAVE_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Monetag reward confirmation recorded",
    });
  } catch (error) {
    console.error(
      "Monetag postback handler failed:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { ok: false, error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
