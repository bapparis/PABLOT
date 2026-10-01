import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  console.log(
    "MONETAG POSTBACK RECEIVED:",
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );

  const params = request.nextUrl.searchParams;

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

  if (rewardEventType !== "yes") {
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

  if (!ymid) {
    return NextResponse.json(
      { ok: false, error: "MISSING_YMID" },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      { ok: false, error: "SERVER_CONFIGURATION_ERROR" },
      { status: 500 }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
  );

  const telegramIdNumber = Number(telegramId);

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramIdNumber)
    .maybeSingle();

  if (userError) {
    console.error("Monetag user lookup failed:", userError);

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
      estimated_price: Number.isFinite(estimatedPrice)
        ? estimatedPrice
        : null,
    });

  if (confirmationError) {
    console.error(
      "Monetag reward confirmation save failed:",
      confirmationError
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
}
