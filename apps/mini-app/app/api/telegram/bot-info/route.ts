import { NextResponse } from "next/server";

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      return NextResponse.json(
        { error: "Telegram bot is not configured." },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!data.ok || !data.result?.username) {
      return NextResponse.json(
        { error: "Unable to retrieve Telegram bot information." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      username: data.result.username,
      first_name: data.result.first_name ?? "",
    });
  } catch (error) {
    console.error("Telegram bot info error:", error);

    return NextResponse.json(
      { error: "Unable to retrieve Telegram bot information." },
      { status: 500 }
    );
  }
}
