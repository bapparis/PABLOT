import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";
import { sendPablotSecurityEmail } from "@/lib/email/resend";

const CODE_EXPIRY_MS = 10 * 60 * 1000;

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
    .digest("hex");
}

function generateCode() {
  return crypto
    .randomInt(0, 1_000_000)
    .toString()
    .padStart(6, "0");
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

    const newEmail =
      typeof body?.newEmail === "string"
        ? body.newEmail.trim().toLowerCase()
        : "";

    if (
      !newEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)
    ) {
      return NextResponse.json(
        { error: "Enter a valid new email address." },
        { status: 400 }
      );
    }

    if (newEmail === owner.email.toLowerCase()) {
      return NextResponse.json(
        { error: "The new email must be different from your current email." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: emailOwner, error: emailLookupError } =
      await supabase
        .from("admin_accounts")
        .select("id")
        .eq("email", newEmail)
        .neq("id", owner.id)
        .maybeSingle();

    if (emailLookupError) {
      throw new Error(
        `Unable to check email availability: ${emailLookupError.message}`
      );
    }

    if (emailOwner) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 }
      );
    }

    const { data: activeRequest, error: activeLookupError } =
      await supabase
        .from("admin_email_change_requests")
        .select("id, created_at")
        .eq("admin_account_id", owner.id)
        .in("status", [
          "pending_current_verification",
          "pending_new_verification",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (activeLookupError) {
      throw new Error(
        `Unable to check existing email change: ${activeLookupError.message}`
      );
    }

    if (activeRequest) {
      return NextResponse.json(
        {
          error:
            "An email change is already in progress. Complete or cancel the existing verification first.",
        },
        { status: 409 }
      );
    }

    const code = generateCode();
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + CODE_EXPIRY_MS
    );

    const { data: changeRequest, error: insertError } =
      await supabase
        .from("admin_email_change_requests")
        .insert({
          admin_account_id: owner.id,
          current_email: owner.email,
          new_email: newEmail,
          current_email_code_hash: hashCode(code),
          current_email_expires_at: expiresAt.toISOString(),
          status: "pending_current_verification",
        })
        .select("id")
        .single();

    if (insertError || !changeRequest) {
      throw new Error(
        `Unable to create email change request: ${
          insertError?.message || "Unknown error"
        }`
      );
    }

    try {
      await sendPablotSecurityEmail({
        to: owner.email,
        subject: "PABLOT owner email change verification",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin-bottom:8px">PABLOT Security</h2>

            <p>
              A request was made to change your PABLOT owner email address.
            </p>

            <p>
              If you made this request, use the verification code below:
            </p>

            <div style="margin:24px 0;padding:18px;text-align:center;background:#f3f4f6;border-radius:12px;font-size:32px;font-weight:800;letter-spacing:8px">
              ${code}
            </div>

            <p>
              This code expires in 10 minutes.
            </p>

            <p style="color:#666">
              If you did not request this change, do not share this code and
              secure your PABLOT owner account immediately.
            </p>

            <p style="margin-top:24px;font-size:13px;color:#888">
              PABLOT Security System
            </p>
          </div>
        `,
      });
    } catch (emailError) {
      await supabase
        .from("admin_email_change_requests")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", changeRequest.id);

      throw emailError;
    }

    return NextResponse.json({
      success: true,
      requestId: changeRequest.id,
      message: "A verification code was sent to your current email.",
      expiresInSeconds: CODE_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error("Admin email change request error:", error);

    return NextResponse.json(
      { error: "Unable to start email change." },
      { status: 500 }
    );
  }
}
