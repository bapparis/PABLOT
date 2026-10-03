import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isOwner } from "@/lib/admin/authorization";
import { hashStaffPassword } from "@/lib/staff/auth";

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

async function requireOwner() {
  return await isOwner();
}

function permissionsForRole(role: string) {
  if (role === "owner") {
    return {
      manage_staff: true,
      manage_withdrawals: true,
      manage_tasks: true,
      manage_users: true,
      view_analytics: true,
      manage_settings: true,
      manage_maintenance: true,
      manage_payments: true,
    };
  }

  if (role === "admin") {
    return {
      manage_staff: false,
      view_overview: true,
      manage_withdrawals: true,
      manage_tasks: true,
      manage_users: true,
      view_analytics: true,
      manage_settings: true,
      manage_maintenance: true,
      manage_payments: true,
    };
  }

  if (role === "moderator") {
    return {
      manage_staff: false,
      view_overview: true,
      manage_withdrawals: true,
      manage_tasks: true,
      manage_users: true,
      view_analytics: true,
      manage_settings: false,
      manage_maintenance: false,
      manage_payments: false,
    };
  }

  return {
    manage_staff: false,
      view_overview: true,
    manage_withdrawals: false,
    manage_tasks: false,
    manage_users: true,
    view_analytics: false,
    manage_settings: false,
    manage_maintenance: false,
    manage_payments: false,
  };
}

export async function GET() {
  const authorized = await requireOwner();

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("admin_staff")
    .select(
      "id,name,email,role,status,permissions,created_by,last_login_at,created_at,updated_at"
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Staff list error:", error);

    return NextResponse.json(
      { error: "Failed to load staff." },
      { status: 500 }
    );
  }

  return NextResponse.json({ staff: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authorized = await requireOwner();

  if (!authorized) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    const role =
      typeof body.role === "string" ? body.role : "admin";

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required." },
        { status: 400 }
      );
    }

    if (!["admin", "moderator", "support"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid staff role." },
        { status: 400 }
      );
    }

    if (password.length < 10) {
      return NextResponse.json(
        { error: "Password must be at least 10 characters." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: existing } = await supabase
      .from("admin_staff")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "A staff account with this email already exists." },
        { status: 409 }
      );
    }

    const { data: staff, error: staffError } = await supabase
      .from("admin_staff")
      .insert({
        name,
        email,
        role,
        status: "active",
        permissions: permissionsForRole(role),
        created_by: "owner",
      })
      .select(
        "id,name,email,role,status,permissions,created_by,last_login_at,created_at,updated_at"
      )
      .single();

    if (staffError || !staff) {
      console.error("Staff creation error:", staffError);

      return NextResponse.json(
        { error: "Failed to create staff account." },
        { status: 500 }
      );
    }

    const { error: credentialsError } = await supabase
      .from("admin_staff_credentials")
      .insert({
        staff_id: staff.id,
        password_hash: hashStaffPassword(password),
      });

    if (credentialsError) {
      await supabase.from("admin_staff").delete().eq("id", staff.id);

      console.error("Staff credentials creation error:", credentialsError);

      return NextResponse.json(
        { error: "Failed to create staff credentials." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, staff },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff creation request error:", error);

    return NextResponse.json(
      { error: "Unable to create staff account." },
      { status: 500 }
    );
  }
}
