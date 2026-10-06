import { NextResponse } from "next/server";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";

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

    return NextResponse.json({
      id: owner.id,
      email: owner.email,
      displayName: owner.display_name,
      role: owner.role,
      isActive: owner.is_active,
      createdAt: owner.created_at,
      updatedAt: owner.updated_at,
    });
  } catch (error) {
    console.error("Admin profile GET error:", error);

    return NextResponse.json(
      { error: "Unable to load admin profile." },
      { status: 500 }
    );
  }
}


export async function PATCH(request: Request) {
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

    const email =
      typeof body?.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const displayName =
      typeof body?.displayName === "string"
        ? body.displayName.trim()
        : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid owner email is required." },
        { status: 400 }
      );
    }

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

    const supabase = (await import("@supabase/supabase-js")).createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { data: emailOwner, error: emailLookupError } =
      await supabase
        .from("admin_accounts")
        .select("id")
        .eq("email", email)
        .neq("id", owner.id)
        .maybeSingle();

    if (emailLookupError) {
      throw new Error(
        `Unable to check owner email: ${emailLookupError.message}`
      );
    }

    if (emailOwner) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("admin_accounts")
      .update({
        email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", owner.id)
      .select(
        "id, email, display_name, role, is_active, auth_version, created_at, updated_at"
      )
      .single();

    if (error) {
      throw new Error(
        `Unable to update owner profile: ${error.message}`
      );
    }

    return NextResponse.json({
      id: data.id,
      email: data.email,
      displayName: data.display_name,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error("Admin profile PATCH error:", error);

    return NextResponse.json(
      { error: "Unable to update admin profile." },
      { status: 500 }
    );
  }
}
