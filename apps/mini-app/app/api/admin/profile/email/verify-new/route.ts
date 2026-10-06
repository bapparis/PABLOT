import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";
import { sendPablotSecurityEmail } from "@/lib/email/resend";

const MAX_ATTEMPTS = 5;
const COOKIE_NAME = "pablot_admin_session";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function hashCode(code: string) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest();
}

function codesMatch(
  submittedCode: string,
  storedHash: string
) {
  const submittedHash = hashCode(submittedCode);
  const storedBuffer = Buffer.from(storedHash, "hex");

  return (
    submittedHash.length === storedBuffer.length &&
    crypto.timingSafeEqual(
      submittedHash,
      storedBuffer
    )
  );
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

    const requestId =
      typeof body?.requestId === "string"
        ? body.requestId.trim()
        : "";

    const code =
      typeof body?.code === "string"
        ? body.code.trim()
        : "";

    if (!requestId || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: changeRequest, error: lookupError } =
      await supabase
        .from("admin_email_change_requests")
        .select("*")
        .eq("id", requestId)
        .eq("admin_account_id", owner.id)
        .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Unable to load email change request: ${lookupError.message}`
      );
    }

    if (!changeRequest) {
      return NextResponse.json(
        { error: "Email change request not found." },
        { status: 404 }
      );
    }

    if (changeRequest.status !== "pending_new_verification") {
      return NextResponse.json(
        { error: "This verification step is no longer active." },
        { status: 409 }
      );
    }

    if (
      new Date(changeRequest.new_email_expires_at).getTime() <
      Date.now()
    ) {
      await supabase
        .from("admin_email_change_requests")
        .update({
          status: "expired",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return NextResponse.json(
        { error: "This verification code has expired." },
        { status: 410 }
      );
    }

    const attempts =
      Number(changeRequest.new_email_attempts ?? 0);

    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          error:
            "Too many verification attempts. Start a new email change request.",
        },
        { status: 429 }
      );
    }

    const matches =
      codesMatch(code, changeRequest.new_email_code_hash);

    if (!matches) {
      await supabase
        .from("admin_email_change_requests")
        .update({
          new_email_attempts: attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    const newEmail = changeRequest.new_email
      .trim()
      .toLowerCase();

    const { data: emailOwner, error: emailLookupError } =
      await supabase
        .from("admin_accounts")
        .select("id")
        .eq("email", newEmail)
        .neq("id", owner.id)
        .maybeSingle();

    if (emailLookupError) {
      throw new Error(
        `Unable to recheck email availability: ${emailLookupError.message}`
      );
    }

    if (emailOwner) {
      await supabase
        .from("admin_email_change_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 }
      );
    }

    const nextAuthVersion =
      Number(owner.auth_version ?? 1) + 1;

    const { error: updateError } = await supabase
      .from("admin_accounts")
      .update({
        email: newEmail,
        auth_version: nextAuthVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id)
      .eq("auth_version", Number(owner.auth_version ?? 1));

    if (updateError) {
      throw new Error(
        `Unable to update owner email: ${updateError.message}`
      );
    }

    const { error: requestUpdateError } = await supabase
      .from("admin_email_change_requests")
      .update({
        new_email_code_hash: null,
        new_email_verified_at: new Date().toISOString(),
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (requestUpdateError) {
      console.error(
        "Unable to finalize email change request:",
        requestUpdateError
      );
    }

    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    try {
      await sendPablotSecurityEmail({
        to: changeRequest.current_email,
        subject: "PABLOT owner email changed",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin-bottom:8px">PABLOT Security</h2>

            <p>
              Your PABLOT owner email address was successfully changed.
            </p>

            <p>
              <strong>Previous email:</strong>
              ${changeRequest.current_email}
            </p>

            <p>
              <strong>New email:</strong>
              ${newEmail}
            </p>

            <p style="color:#666">
              Your previous owner session has been invalidated and you must
              sign in again with the new email address.
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
        "Owner email change notification failed:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Owner email changed successfully. Please sign in again.",
      email: newEmail,
    });
  } catch (error) {
    console.error(
      "Admin new email verification error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to complete email change." },
      { status: 500 }
    );
  }
}
