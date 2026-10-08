import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/settings/platform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPlatformSettings();

    return NextResponse.json(
      { ppPerUsd: settings.ppPerUsd },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "Unable to load conversion rate." },
      { status: 500 }
    );
  }
}
