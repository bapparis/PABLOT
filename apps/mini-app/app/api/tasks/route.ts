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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY;

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

  const { data: tasks, error: tasksError } =
    await supabase
      .from("tasks")
      .select(
        "id, title, description, type, reward_pp, target_url, proof_required"
      )
      .eq("active", true)
      .order("created_at", { ascending: false });

  if (tasksError) {
    return NextResponse.json(
      { error: tasksError.message },
      { status: 500 }
    );
  }

  const watchTaskIds = (tasks ?? [])
    .filter((task) => task.type === "watch_ads")
    .map((task) => task.id);

  if (watchTaskIds.length === 0) {
    return NextResponse.json({
      tasks: tasks ?? [],
    });
  }

  const { data: watchConfigs, error: configError } =
    await supabase
      .from("watch_task_configs")
      .select(
        "task_id, ads_required, watch_duration_seconds, cooldown_seconds, pinned, pin_order"
      )
      .in("task_id", watchTaskIds);

  if (configError) {
    return NextResponse.json(
      { error: configError.message },
      { status: 500 }
    );
  }

  const configMap = new Map(
    (watchConfigs ?? []).map((config) => [
      config.task_id,
      {
        ads_required: config.ads_required,
        watch_duration_seconds:
          config.watch_duration_seconds,
        cooldown_seconds: config.cooldown_seconds,
        pinned: config.pinned,
        pin_order: config.pin_order,
      },
    ])
  );

  const enrichedTasks = (tasks ?? []).map((task) => ({
    ...task,
    ...(task.type === "watch_ads"
      ? {
          watch_config:
            configMap.get(task.id) ?? null,
        }
      : {}),
  }));

  return NextResponse.json({
    tasks: enrichedTasks,
  });
}
