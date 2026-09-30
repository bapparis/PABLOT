import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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
    calculated.length !== received.length ||
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const initData = body?.initData;

    if (typeof initData !== "string" || !initData) {
      return NextResponse.json(
        { error: "initData is required." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
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

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@Xpablot&user_id=${telegramUser.id}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json({
      telegram_user_id: telegramUser.id,
      ok: data.ok,
      membership: data.ok ? data.result : null,
      error: data.ok ? null : data.description,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
