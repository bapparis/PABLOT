import { NextResponse } from "next/server";

export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is missing." },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json({
      ok: data.ok,
      bot: data.ok ? data.result : null,
      error: data.ok ? null : data.description,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to contact Telegram." },
      { status: 502 }
    );
  }
}
