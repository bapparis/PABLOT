import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/lib/settings/platform";

export async function GET() {
  try {
    const settings = await getPlatformSettings();

    return NextResponse.json({
      enabled: settings.supportEnabled,
      url: settings.supportTelegramUrl,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load support settings." },
      { status: 500 }
    );
  }
}
