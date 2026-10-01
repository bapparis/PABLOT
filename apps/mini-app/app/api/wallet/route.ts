import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function verifyTelegramInitData(
  initData: string,
  botToken: string
) {
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

  if (
    !authDate ||
    Math.abs(Date.now() / 1000 - authDate) > 86400
  ) {
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

function isValidBscAddress(address: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function getAuthenticatedUser(initData: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!botToken || !supabaseUrl || !supabaseSecretKey) {
    throw new Error("Server configuration is incomplete.");
  }

  const telegramUser = verifyTelegramInitData(
    initData,
    botToken
  );

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

    const { data: wallets, error } = await auth.supabase
      .from("withdrawal_wallets")
      .select("id, network, address, created_at, updated_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wallets: wallets ?? [],
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load wallets." },
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

    const network = body?.network;
    const address =
      typeof body?.address === "string"
        ? body.address.trim()
        : "";

    if (!["bsc", "ton", "trx"].includes(network)) {
      return NextResponse.json(
        { error: "Unsupported wallet network." },
        { status: 400 }
      );
    }

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required." },
        { status: 400 }
      );
    }

    if (
      network === "bsc" &&
      !isValidBscAddress(address)
    ) {
      return NextResponse.json(
        { error: "Invalid BSC wallet address." },
        { status: 400 }
      );
    }

    const { data: wallet, error } =
      await auth.supabase
        .from("withdrawal_wallets")
        .upsert(
          {
            user_id: auth.userId,
            network,
            address,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,network",
          }
        )
        .select(
          "id, network, address, created_at, updated_at"
        )
        .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      wallet,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to save wallet." },
      { status: 400 }
    );
  }
}
