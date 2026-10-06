import { NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  createOrUpdateOwnerAccount,
  getOwnerAccount,
} from "@/lib/admin/owner";

function safeCompare(value: string, expected: string) {
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
    const existingOwner = await getOwnerAccount();

    if (existingOwner) {
      return NextResponse.json(
        { error: "Owner account has already been configured." },
        { status: 409 }
      );
    }

    const bootstrapPassword = process.env.ADMIN_PASSWORD;

    if (!bootstrapPassword) {
      return NextResponse.json(
        { error: "Admin bootstrap password is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const bootstrap =
      typeof body?.bootstrapPassword === "string"
        ? body.bootstrapPassword
        : "";

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.trim()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!safeCompare(bootstrap, bootstrapPassword)) {
      return NextResponse.json(
        { error: "Invalid bootstrap password." },
        { status: 401 }
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid owner email is required." },
        { status: 400 }
      );
    }

    if (displayName.length < 2) {
      return NextResponse.json(
        { error: "Owner name is required." },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters." },
        { status: 400 }
      );
    }

    const owner = await createOrUpdateOwnerAccount({
      email,
      displayName,
      password,
    });

    return NextResponse.json({
      success: true,
      owner: {
        id: owner.id,
        email: owner.email,
        displayName: owner.display_name,
      },
    });
  } catch (error) {
    console.error("Admin owner setup error:", error);

    return NextResponse.json(
      { error: "Unable to configure owner account." },
      { status: 500 }
    );
  }
}
