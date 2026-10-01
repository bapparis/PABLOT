import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

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

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (userError) {
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

  const { error: insertError } = await supabase
    .from("adsgram_reward_confirmations")
    .insert({
      user_id: user.id,
      telegram_id: telegramId,
    });

  if (insertError) {
    return NextResponse.json(
      { ok: false, error: "CONFIRMATION_SAVE_FAILED" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "AdsGram reward confirmation recorded",
  });
}
