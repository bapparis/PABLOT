import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/authorization";
import {
  getOwnerAccount,
  hashOwnerPassword,
  verifyOwnerPassword,
} from "@/lib/admin/owner";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    if (!(await isOwner())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const owner = await getOwnerAccount();

    if (!owner) {
      return NextResponse.json(
        { error: "Owner account not found." },
        { status: 404 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body?.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body?.newPassword === "string"
        ? body.newPassword
        : "";

    const confirmPassword =
      typeof body?.confirmPassword === "string"
        ? body.confirmPassword
        : "";

    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 }
      );
    }

    if (!verifyOwnerPassword(currentPassword, owner.password_hash)) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    if (newPassword.length < 10) {
      return NextResponse.json(
        { error: "New password must be at least 10 characters." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New passwords do not match." },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const nextAuthVersion =
      Number(owner.auth_version ?? 1) + 1;

    const { error } = await supabase
      .from("admin_accounts")
      .update({
        password_hash: hashOwnerPassword(newPassword),
        auth_version: nextAuthVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id);

    if (error) {
      throw new Error(
        `Unable to update owner password: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Admin password change error:", error);

    return NextResponse.json(
      { error: "Unable to change password." },
      { status: 500 }
    );
  }
}
