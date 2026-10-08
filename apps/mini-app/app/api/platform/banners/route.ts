import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeBanners } from "@/lib/home-banners";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error("Supabase configuration is missing.");
    }

    const supabase = createClient(url, key);

    const { data, error } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "home_banners")
      .maybeSingle();

    if (error) throw new Error("Unable to load banners.");

    const banners =
      data?.value == null ? [] : normalizeBanners(data.value);

    if (!banners) throw new Error("Invalid banner configuration.");

    return NextResponse.json(
      {
        banners: banners.filter(
          (banner) =>
            banner.active &&
            banner.title.length > 0
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load banners." },
      { status: 500 }
    );
  }
}
