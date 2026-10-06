import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

const allowedTypes = [
  "join_channel",
  "follow",
  "visit",
  "watch",
  "watch_ads",
  "social",
  "custom",
] as const;

const allowedProviders = [
  "monetag",
  "adsgram",
  "adsterra",
] as const;

type TaskType = (typeof allowedTypes)[number];
type WatchProvider = (typeof allowedProviders)[number];

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase server credentials are not configured."
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isValidType(value: unknown): value is TaskType {
  return (
    typeof value === "string" &&
    allowedTypes.includes(value as TaskType)
  );
}

function isValidProvider(value: unknown): value is WatchProvider {
  return (
    typeof value === "string" &&
    allowedProviders.includes(value as WatchProvider)
  );
}

function isValidTargetUrl(value: string | null) {
  if (!value) return true;
  return /^https?:\/\//i.test(value);
}

async function getNextPinOrder(
  supabase: ReturnType<typeof getAdminSupabase>,
  taskId: string
) {
  const { data, error } = await supabase
    .from("watch_task_configs")
    .select("pin_order")
    .eq("pinned", true)
    .neq("task_id", taskId)
    .not("pin_order", "is", null)
    .order("pin_order", { ascending: true });

  if (error) {
    throw error;
  }

  const used = new Set(
    (data ?? [])
      .map((item) => item.pin_order)
      .filter(
        (value): value is number =>
          typeof value === "number"
      )
  );

  for (let order = 1; order <= 5; order += 1) {
    if (!used.has(order)) {
      return order;
    }
  }

  return null;
}

async function hasPinCapacity(
  supabase: ReturnType<typeof getAdminSupabase>,
  taskId: string
) {
  const { count, error } = await supabase
    .from("watch_task_configs")
    .select("task_id", {
      count: "exact",
      head: true,
    })
    .eq("pinned", true)
    .neq("task_id", taskId);

  if (error) {
    throw error;
  }

  return (count ?? 0) < 5;
}

function validateWatchConfig(body: any) {
  if (!isValidProvider(body.provider)) {
    return "A valid Watch Ads provider is required.";
  }

  const adsRequired = Number(body.ads_required);

  if (
    !Number.isInteger(adsRequired) ||
    adsRequired < 1 ||
    adsRequired > 100
  ) {
    return "Ads required must be a whole number between 1 and 100.";
  }

  const watchDuration = Number(
    body.watch_duration_seconds
  );

  if (
    !Number.isInteger(watchDuration) ||
    watchDuration < 0 ||
    watchDuration > 3600
  ) {
    return "Watch duration must be between 0 and 3600 seconds.";
  }

  const cooldown = Number(body.cooldown_seconds);

  if (
    !Number.isInteger(cooldown) ||
    cooldown < 0 ||
    cooldown > 2592000
  ) {
    return "Cooldown must be between 0 and 30 days.";
  }

  if (
    body.pinned !== undefined &&
    typeof body.pinned !== "boolean"
  ) {
    return "Pinned must be boolean.";
  }

  if (
    body.pin_order !== undefined &&
    body.pin_order !== null &&
    (!Number.isInteger(body.pin_order) ||
      body.pin_order < 1 ||
      body.pin_order > 5)
  ) {
    return "Pin order must be between 1 and 5.";
  }

  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminPermission("manage_tasks"))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Task ID is required." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const supabase = getAdminSupabase();

    const { data: existingTask, error: existingError } =
      await supabase
        .from("tasks")
        .select("id,type")
        .eq("id", id)
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingTask) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      if (
        typeof body.title !== "string" ||
        !body.title.trim()
      ) {
        return NextResponse.json(
          { error: "Title is required." },
          { status: 400 }
        );
      }

      updates.title = body.title.trim();
    }

    if ("description" in body) {
      if (typeof body.description !== "string") {
        return NextResponse.json(
          { error: "Description must be text." },
          { status: 400 }
        );
      }

      updates.description = body.description.trim();
    }

    if ("type" in body) {
      if (!isValidType(body.type)) {
        return NextResponse.json(
          { error: "Invalid task type." },
          { status: 400 }
        );
      }

      updates.type = body.type;
    }

    if ("reward_pp" in body) {
      if (
        !Number.isInteger(body.reward_pp) ||
        body.reward_pp <= 0 ||
        body.reward_pp > 1_000_000
      ) {
        return NextResponse.json(
          {
            error:
              "Reward must be an integer between 1 and 1,000,000 PP.",
          },
          { status: 400 }
        );
      }

      updates.reward_pp = body.reward_pp;
    }

    if ("target_url" in body) {
      const targetUrl =
        typeof body.target_url === "string"
          ? body.target_url.trim()
          : null;

      if (!isValidTargetUrl(targetUrl)) {
        return NextResponse.json(
          {
            error:
              "Target URL must start with http:// or https://.",
          },
          { status: 400 }
        );
      }

      updates.target_url = targetUrl || null;
    }

    if ("proof_required" in body) {
      if (typeof body.proof_required !== "boolean") {
        return NextResponse.json(
          { error: "proof_required must be boolean." },
          { status: 400 }
        );
      }

      updates.proof_required = body.proof_required;
    }

    if ("active" in body) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json(
          { error: "active must be boolean." },
          { status: 400 }
        );
      }

      updates.active = body.active;
    }

    const resultingType =
      typeof updates.type === "string"
        ? updates.type
        : existingTask.type;

    const hasWatchFields =
      "provider" in body ||
      "ads_required" in body ||
      "watch_duration_seconds" in body ||
      "cooldown_seconds" in body ||
      "pinned" in body ||
      "pin_order" in body;

    if (resultingType === "watch_ads" && hasWatchFields) {
      const configError = validateWatchConfig(body);

      if (configError) {
        return NextResponse.json(
          { error: configError },
          { status: 400 }
        );
      }

      let pinned = body.pinned === true;
      let pinOrder =
        body.pin_order === null ||
        body.pin_order === undefined
          ? null
          : Number(body.pin_order);

      if (pinned) {
        const hasCapacity = await hasPinCapacity(
          supabase,
          id
        );

        if (!hasCapacity) {
          const { data: currentConfig } =
            await supabase
              .from("watch_task_configs")
              .select("pinned")
              .eq("task_id", id)
              .maybeSingle();

          if (!currentConfig?.pinned) {
            return NextResponse.json(
              {
                error:
                  "Only 5 Watch Ads tasks can be pinned.",
              },
              { status: 409 }
            );
          }
        }

        if (pinOrder === null) {
          pinOrder = await getNextPinOrder(
            supabase,
            id
          );
        }
      } else {
        pinOrder = null;
      }

      const configPayload = {
        provider: body.provider,
        ads_required: Number(body.ads_required),
        watch_duration_seconds: Number(
          body.watch_duration_seconds
        ),
        cooldown_seconds: Number(body.cooldown_seconds),
        pinned,
        pin_order: pinOrder,
        updated_at: new Date().toISOString(),
      };

      const { error: configUpsertError } = await supabase
        .from("watch_task_configs")
        .upsert({
          task_id: id,
          ...configPayload,
        });

      if (configError) {
        throw configError;
      }
    } else if (
      resultingType !== "watch_ads" &&
      existingTask.type === "watch_ads"
    ) {
      const { error: configError } = await supabase
        .from("watch_task_configs")
        .delete()
        .eq("task_id", id);

      if (configError) {
        throw configError;
      }
    }

    if (Object.keys(updates).length === 0 && !hasWatchFields) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(
        "id,title,description,type,reward_pp,target_url,proof_required,active,created_at,updated_at"
      )
      .single();

    if (error) {
      console.error("Admin task update error:", error);

      return NextResponse.json(
        { error: "Failed to update task." },
        { status: 500 }
      );
    }

    const { data: watchConfig, error: watchConfigError } =
      await supabase
        .from("watch_task_configs")
        .select(
          "task_id,provider,ads_required,watch_duration_seconds,cooldown_seconds,pinned,pin_order"
        )
        .eq("task_id", id)
        .maybeSingle();

    if (watchConfigError) {
      throw watchConfigError;
    }

    return NextResponse.json({
      task: {
        ...data,
        watch_config:
          data.type === "watch_ads"
            ? watchConfig ?? null
            : null,
      },
    });
  } catch (error) {
    console.error("Admin task PATCH error:", error);

    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await hasAdminPermission("manage_tasks"))) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Task ID is required." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminSupabase();

    const { count: taskCompletionCount, error: countError } =
      await supabase
        .from("task_completions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("task_id", id);

    if (countError) {
      console.error(
        "Admin completion count error:",
        countError
      );

      return NextResponse.json(
        { error: "Failed to check task history." },
        { status: 500 }
      );
    }

    const {
      count: watchCompletionCount,
      error: watchCountError,
    } = await supabase
      .from("watch_task_completions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("task_id", id);

    if (watchCountError) {
      console.error(
        "Admin Watch Ads completion count error:",
        watchCountError
      );

      return NextResponse.json(
        { error: "Failed to check task history." },
        { status: 500 }
      );
    }

    const totalHistory =
      (taskCompletionCount ?? 0) +
      (watchCompletionCount ?? 0);

    if (totalHistory > 0) {
      return NextResponse.json(
        {
          error:
            "This task has completion history and cannot be deleted. Deactivate it instead.",
        },
        { status: 409 }
      );
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Admin task delete error:", error);

      return NextResponse.json(
        { error: "Failed to delete task." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Admin task DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to delete task." },
      { status: 500 }
    );
  }
}
