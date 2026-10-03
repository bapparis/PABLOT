import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

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

export async function GET(request: NextRequest) {
  const allowed = await hasAdminPermission("manage_users");

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const limitParam = Number(searchParams.get("limit") || "50");

    const limit = Math.min(
      Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1),
      100
    );

    const supabase = getAdminSupabase();

    let query = supabase
      .from("users")
      .select(
        "id,telegram_id,pablot_id,username,first_name,last_name,photo_url,pp_balance,total_earned,language,notifications_enabled,created_at,updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");

      query = query.or(
        `username.ilike.%${escaped}%,pablot_id.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`
      );
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Admin users lookup error:", error);

      return NextResponse.json(
        { error: "Unable to load users." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: users ?? [],
    });
  } catch (error) {
    console.error("Admin users error:", error);

    return NextResponse.json(
      { error: "Unable to load users." },
      { status: 500 }
    );
  }
}
