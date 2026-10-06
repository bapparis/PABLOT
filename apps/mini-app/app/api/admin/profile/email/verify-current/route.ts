import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";
import { sendPablotSecurityEmail } from "@/lib/email/resend";

const CODE_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

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

    if (changeRequest.status !== "pending_current_verification") {
      return NextResponse.json(
        { error: "This verification step is no longer active." },
        { status: 409 }
      );
    }

    if (
      new Date(changeRequest.current_email_expires_at).getTime() <
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
      Number(changeRequest.current_email_attempts ?? 0);

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
      codesMatch(code, changeRequest.current_email_code_hash);

    if (!matches) {
      await supabase
        .from("admin_email_change_requests")
        .update({
          current_email_attempts: attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    const newCode = generateCode();
    const expiresAt = new Date(
      Date.now() + CODE_EXPIRY_MS
    );

    await supabase
      .from("admin_email_change_requests")
      .update({
        current_email_code_hash: null,
        current_email_verified_at: new Date().toISOString(),
        new_email_code_hash: hashCode(newCode),
        new_email_expires_at: expiresAt.toISOString(),
        new_email_attempts: 0,
        status: "pending_new_verification",
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    try {
      await sendPablotSecurityEmail({
        to: changeRequest.new_email,
        subject: "PABLOT new owner email verification",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin-bottom:8px">PABLOT Security</h2>

            <p>
              Your current owner email has been verified successfully.
            </p>

            <p>
              Use the code below to confirm this new email address:
            </p>

            <div style="margin:24px 0;padding:18px;text-align:center;background:#f3f4f6;border-radius:12px;font-size:32px;font-weight:800;letter-spacing:8px">
              ${newCode}
            </div>

            <p>
              This code expires in 10 minutes.
            </p>

            <p style="color:#666">
              If you did not request this change, contact your PABLOT administrator immediately.
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
        .eq("id", requestId);

      throw emailError;
    }

    return NextResponse.json({
      success: true,
      message: "Current email verified. A verification code was sent to the new email.",
      expiresInSeconds: CODE_EXPIRY_MS / 1000,
    });
  } catch (error) {
    console.error(
      "Admin current email verification error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to verify current email." },
      { status: 500 }
    );
  }
}
