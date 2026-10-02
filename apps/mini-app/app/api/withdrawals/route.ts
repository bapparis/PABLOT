import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verifyTelegramInitData(initData: string, botToken: string) {
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

  const calculated = Buffer.from(calculatedHash, "hex");
  const received = Buffer.from(hash, "hex");

  if (
    received.length !== calculated.length ||
    !crypto.timingSafeEqual(calculated, received)
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));

  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) {
    return null;
  }

  const userRaw = params.get("user");

  if (!userRaw) return null;

  try {
    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

async function getAuthenticatedUser(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!botToken || !supabaseUrl || !supabaseSecretKey) {
    throw new Error("Server configuration is incomplete.");
  }

  const telegramUser = verifyTelegramInitData(initData, botToken);

  if (!telegramUser?.id) {
    return null;
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
  );

  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .eq("telegram_id", telegramUser.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return user
    ? { supabase, userId: user.id }
    : null;
}

function mapWithdrawalError(message: string) {
  const knownErrors: Record<string, string> = {
    MINIMUM_WITHDRAWAL_5000_PP:
      "Minimum withdrawal is 5,000 PP ($5).",
    WITHDRAWAL_MUST_BE_MULTIPLE_OF_1000_PP:
      "Withdrawal amount must be in 1,000 PP increments.",
    INSUFFICIENT_PP_BALANCE:
      "Insufficient PP balance.",
    BSC_WALLET_NOT_CONNECTED:
      "Please connect your BSC withdrawal wallet first.",
    USER_NOT_FOUND:
      "User account not found.",
    INVALID_WITHDRAWAL_AMOUNT:
      "Invalid withdrawal amount.",
  };

  return knownErrors[message] ?? "Unable to create withdrawal.";
}

export async function GET(request: NextRequest) {
  try {
    const initData =
      request.headers.get("x-telegram-init-data");

    if (!initData) {
      return NextResponse.json(
        { error: "Telegram authentication is required." },
        { status: 401 }
      );
    }

    const auth = await getAuthenticatedUser(initData);

    if (!auth) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data." },
        { status: 401 }
      );
    }

    const { data: withdrawals, error } = await auth.supabase
      .from("withdrawals")
      .select(
        "id, amount_pp, gross_usd, fee_usd, net_usd, network, wallet_address, status, tx_hash, rejection_reason, created_at, updated_at"
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Unable to load withdrawals." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      withdrawals: withdrawals ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load withdrawals." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const initData =
      request.headers.get("x-telegram-init-data");

    if (!initData) {
      return NextResponse.json(
        { error: "Telegram authentication is required." },
        { status: 401 }
      );
    }

    const auth = await getAuthenticatedUser(initData);

    if (!auth) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountPP = Number(body?.amount_pp);

    if (
      !Number.isInteger(amountPP) ||
      amountPP <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount." },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabase.rpc(
      "request_withdrawal",
      {
        p_user_id: auth.userId,
        p_amount_pp: amountPP,
      }
    );

    if (error) {
      console.error("Withdrawal request error:", error);

      return NextResponse.json(
        { error: mapWithdrawalError(error.message) },
        { status: 400 }
      );
    }

    const withdrawal = Array.isArray(data)
      ? data[0]
      : data;

    return NextResponse.json({
      withdrawal,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create withdrawal." },
      { status: 400 }
    );
  }
}
