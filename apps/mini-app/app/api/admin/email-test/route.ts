import { NextResponse } from "next/server";
import { isOwner } from "@/lib/admin/authorization";
import { getOwnerAccount } from "@/lib/admin/owner";
import { sendPablotSecurityEmail } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

    await sendPablotSecurityEmail({
      to: owner.email,
      subject: "PABLOT Security Email Test",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px">
          <h2 style="margin-bottom:8px">PABLOT Security</h2>
          <p>This is a test security email from your PABLOT Command Center.</p>
          <p style="color:#666">
            Your transactional email delivery is working correctly.
          </p>
          <p style="margin-top:24px;font-size:13px;color:#888">
            PABLOT Security System
          </p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Security test email sent.",
    });
  } catch (error) {
    console.error("Admin email test error:", error);

    return NextResponse.json(
      { error: "Unable to send security test email." },
      { status: 500 }
    );
  }
}
