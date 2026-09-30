import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");

  if (!userId || !/^\d+$/.test(userId)) {
    return NextResponse.json(
      { ok: false, error: "INVALID_USER_ID" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    telegramId: userId,
    message: "AdsGram reward callback received",
  });
}
