import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  setStaffSession,
  verifyStaffPassword,
} from "@/lib/staff/auth";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: staff, error: staffError } = await supabase
      .from("admin_staff")
      .select("id,name,email,role,status")
      .eq("email", email)
      .maybeSingle();

    if (staffError) {
      console.error("Staff lookup error:", staffError);

      return NextResponse.json(
        { error: "Unable to sign in." },
        { status: 500 }
      );
    }

    if (!staff || staff.status !== "active") {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const { data: credentials, error: credentialsError } =
      await supabase
        .from("admin_staff_credentials")
        .select("password_hash")
        .eq("staff_id", staff.id)
        .maybeSingle();

    if (credentialsError) {
      console.error("Staff credentials lookup error:", credentialsError);

      return NextResponse.json(
        { error: "Unable to sign in." },
        { status: 500 }
      );
    }

    if (
      !credentials ||
      !verifyStaffPassword(password, credentials.password_hash)
    ) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    await setStaffSession(staff.id);

    await supabase
      .from("admin_staff")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", staff.id);

    return NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);

    return NextResponse.json(
      { error: "Unable to sign in." },
      { status: 500 }
    );
  }
}
