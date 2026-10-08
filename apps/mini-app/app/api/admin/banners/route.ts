import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";
import { normalizeBanners } from "@/lib/home-banners";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Supabase configuration is missing.");
  }

  return createClient(url, key);
}

async function readBanners() {
  const { data, error } = await getSupabase()
    .from("platform_settings")
    .select("value")
    .eq("key", "home_banners")
    .maybeSingle();

  if (error) throw new Error("Unable to load banners.");

  if (data?.value == null) return [];

  const banners = normalizeBanners(data.value);

  if (!banners) throw new Error("Stored banner configuration is invalid.");

  return banners;
}

export async function GET() {
  if (!(await hasAdminPermission("manage_settings"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json(
      { banners: await readBanners() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load banners." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!(await hasAdminPermission("manage_settings"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid banner payload." }, { status: 400 });
  }

  const banners = normalizeBanners(
    (body as Record<string, unknown>).banners
  );

  if (!banners) {
    return NextResponse.json(
      {
        error:
          "Invalid banners. Use up to 10 banners, with valid HTTP/HTTPS URLs and titles no longer than 60 characters.",
      },
      { status: 400 }
    );
  }

  try {
    const { error } = await getSupabase()
      .from("platform_settings")
      .upsert(
        {
          key: "home_banners",
          value: banners,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );

    if (error) {
      return NextResponse.json(
        { error: "Unable to save banners." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, banners },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to save banners." },
      { status: 500 }
    );
  }
}
