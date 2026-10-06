import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  getOwnerAccount,
  verifyOwnerPassword,
} from "@/lib/admin/owner";

function createSessionToken(authVersion: number) {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  const payload = `pablot-admin:owner:${Date.now()}:${authVersion}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

function safeCompare(
  value: string,
  expected: string
) {
  if (value.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(value),
    Buffer.from(expected)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

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

    const owner = await getOwnerAccount();

    let passwordMatches = false;

    if (owner) {
      if (!email || email !== owner.email.toLowerCase()) {
        return NextResponse.json(
          { error: "Invalid owner credentials." },
          { status: 401 }
        );
      }

      passwordMatches = verifyOwnerPassword(
        password,
        owner.password_hash
      );
    } else {
      const adminPassword =
        process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        return NextResponse.json(
          {
            error:
              "Admin authentication is not configured.",
          },
          { status: 500 }
        );
      }

      passwordMatches = safeCompare(
        password,
        adminPassword
      );
    }

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Invalid owner credentials." },
        { status: 401 }
      );
    }

    const token = createSessionToken(
      Number(owner?.auth_version ?? 1)
    );

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
  } catch (error) {
    console.error("Admin login error:", error);

    return NextResponse.json(
      { error: "Unable to authenticate." },
      { status: 500 }
    );
  }
}
