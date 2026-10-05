import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

export async function GET() {
  if (await isMaintenanceEnabled("tasks")) {
    return NextResponse.json(
      {
        error:
          "Tasks are temporarily unavailable. Please try again later.",
        code: "TASKS_MAINTENANCE",
      },
      { status: 503 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return NextResponse.json(
      { error: "Server configuration is incomplete." },
      { status: 500 }
    );
  }

  const supabase = createClient(
    supabaseUrl,
    supabaseSecretKey
  );

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, title, description, type, reward_pp, target_url, proof_required"
    )
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks: data });
}
