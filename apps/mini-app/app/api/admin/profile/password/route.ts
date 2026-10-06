import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/authorization";
import { sendPablotSecurityEmail } from "@/lib/email/resend";
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

    try {
      await sendPablotSecurityEmail({
        to: owner.email,
        subject: "PABLOT owner password changed",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin-bottom:8px">PABLOT Security</h2>
            <p>Your PABLOT owner account password was successfully changed.</p>
            <p style="color:#666">
              All previous owner sessions have been invalidated.
              You must sign in again with your new password.
            </p>
            <p style="color:#b91c1c">
              If you did not make this change, secure your PABLOT account immediately.
            </p>
            <p style="margin-top:24px;font-size:13px;color:#888">
              PABLOT Security System
            </p>
          </div>
        `,
      });
    } catch (notificationError) {
      console.error(
        "Owner password change notification failed:",
        notificationError
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
