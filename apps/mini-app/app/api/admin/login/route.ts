import { NextResponse } from "next/server";
import crypto from "node:crypto";

function createSessionToken() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  const payload = `pablot-admin:owner:${Date.now()}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin authentication is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!password) {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    const passwordMatches =
      password.length === adminPassword.length &&
      crypto.timingSafeEqual(
        Buffer.from(password),
        Buffer.from(adminPassword)
      );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid admin password." },
        { status: 401 }
      );
    }

    const token = createSessionToken();

    const response = NextResponse.json({
      success: true,
    });

    response.cookies.set({
      name: "pablot_admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to authenticate." },
      { status: 500 }
    );
  }
}
