import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";
import { sendPablotSecurityEmail } from "@/lib/email/resend";

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

    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.trim()
        : "";

    if (displayName.length < 2) {
      return NextResponse.json(
        { error: "Display name must be at least 2 characters." },
        { status: 400 }
      );
    }

    if (displayName.length > 80) {
      return NextResponse.json(
        { error: "Display name must be 80 characters or fewer." },
        { status: 400 }
      );
    }

    if (displayName === owner.display_name) {
      return NextResponse.json(
        { error: "Enter a different display name." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("admin_accounts")
      .update({
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id)
      .select(
        "id, email, display_name, role, is_active, created_at, updated_at"
      )
      .single();

    if (error) {
      throw new Error(
        `Unable to update owner display name: ${error.message}`
      );
    }

    try {
      await sendPablotSecurityEmail({
        to: owner.email,
        subject: "PABLOT owner display name changed",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111">
            <h2 style="margin-bottom:8px">PABLOT Security</h2>

            <p>
              Your PABLOT owner display name was successfully changed.
            </p>

            <p>
              <strong>Previous name:</strong>
              ${owner.display_name}
            </p>

            <p>
              <strong>New name:</strong>
              ${displayName}
            </p>

            <p style="color:#666">
              If you made this change, no further action is required.
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
        "Owner display name notification failed:",
        notificationError
      );
    }

    return NextResponse.json({
      success: true,
      message: "Display name updated successfully.",
      profile: {
        id: data.id,
        email: data.email,
        displayName: data.display_name,
        role: data.role,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    console.error(
      "Admin display name update error:",
      error
    );

    return NextResponse.json(
      { error: "Unable to update display name." },
      { status: 500 }
    );
  }
}
