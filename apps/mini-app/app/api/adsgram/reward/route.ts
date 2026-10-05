import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

export async function GET(request: NextRequest) {
  if (await isMaintenanceEnabled("watchAds")) {
    return NextResponse.json(
      {
        ok: false,
        error: "WATCH_ADS_MAINTENANCE",
      },
      { status: 503 }
    );
  }

  const userId =
    request.nextUrl.searchParams.get("userId") ??
    request.nextUrl.searchParams.get("userid") ??
    request.nextUrl.searchParams.get("telegramId");

  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_USER_ID" },
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

  const telegramId = Number(userId);

  const { data, error } = await supabase.rpc(
    "confirm_adsgram_ad_attempt",
    {
      p_telegram_id: telegramId,
    }
  );

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "CONFIRMATION_FAILED",
      },
      { status: 500 }
    );
  }

  const confirmation = Array.isArray(data) ? data[0] : null;

  if (!confirmation) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_PENDING_ATTEMPT",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    attemptId: confirmation.attempt_id,
    status: confirmation.status,
    confirmedAt: confirmation.confirmed_at,
  });
}
