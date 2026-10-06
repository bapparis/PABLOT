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

function isValidWatchConfig(body: any) {
  if (!isValidProvider(body?.provider)) {
    return "A valid Watch Ads provider is required.";
  }

  const adsRequired = Number(body?.ads_required);

  if (
    !Number.isInteger(adsRequired) ||
    adsRequired < 1 ||
    adsRequired > 100
  ) {
    return "Ads required must be a whole number between 1 and 100.";
  }

  const watchDuration = Number(body?.watch_duration_seconds);

  if (
    !Number.isInteger(watchDuration) ||
    watchDuration < 0 ||
    watchDuration > 3600
  ) {
    return "Watch duration must be between 0 and 3600 seconds.";
  }

  const cooldown = Number(body?.cooldown_seconds);

  if (
    !Number.isInteger(cooldown) ||
    cooldown < 0 ||
    cooldown > 2592000
  ) {
    return "Cooldown must be between 0 and 30 days.";
  }

  if (
    body?.watch_config?.pinned !== undefined &&
    typeof body.pinned !== "boolean"
  ) {
    return "Pinned must be boolean.";
  }

  if (
    body?.watch_config?.pin_order !== undefined &&
    body.pin_order !== null &&
    (!Number.isInteger(body.pin_order) ||
      body.pin_order < 1 ||
      body.pin_order > 5)
  ) {
    return "Pin order must be between 1 and 5.";
  }

  return null;
}

async function getNextPinOrder(supabase: ReturnType<typeof getAdminSupabase>) {
  const { data, error } = await supabase
    .from("watch_task_configs")
    .select("pin_order")
    .eq("pinned", true)
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

async function ensurePinCapacity(
  supabase: ReturnType<typeof getAdminSupabase>,
  taskId?: string
) {
  let query = supabase
    .from("watch_task_configs")
    .select("task_id")
    .eq("pinned", true);

  if (taskId) {
    query = query.neq("task_id", taskId);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return (count ?? 0) < 5;
}

export async function GET() {
  try {
    if (!(await hasAdminPermission("manage_tasks"))) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const supabase = getAdminSupabase();

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(
        "id,title,description,type,reward_pp,target_url,proof_required,active,created_at,updated_at"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    const taskIds = (tasks ?? []).map(
      (task) => task.id
    );

    let completionCounts: Record<string, number> = {};

    if (taskIds.length > 0) {
      const { data: completions, error: completionError } =
        await supabase
          .from("task_completions")
          .select("task_id")
          .in("task_id", taskIds);

      if (completionError) {
        throw completionError;
      }

      completionCounts = (completions ?? []).reduce(
        (counts, completion) => {
          counts[completion.task_id] =
            (counts[completion.task_id] ?? 0) + 1;

          return counts;
        },
        {} as Record<string, number>
      );

      const { data: watchCompletions, error: watchError } =
        await supabase
          .from("watch_task_completions")
          .select("task_id")
          .in("task_id", taskIds);

      if (watchError) {
        throw watchError;
      }

      for (const completion of watchCompletions ?? []) {
        completionCounts[completion.task_id] =
          (completionCounts[completion.task_id] ?? 0) + 1;
      }
    }

    const { data: watchConfigs, error: configError } =
      taskIds.length > 0
        ? await supabase
            .from("watch_task_configs")
            .select(
              "task_id,provider,ads_required,watch_duration_seconds,cooldown_seconds,pinned,pin_order"
            )
            .in("task_id", taskIds)
        : { data: [], error: null };

    if (configError) {
      throw configError;
    }

    const configMap = new Map(
      (watchConfigs ?? []).map((config) => [
        config.task_id,
        config,
      ])
    );

    return NextResponse.json({
      tasks: (tasks ?? []).map((task) => ({
        ...task,
        completion_count:
          completionCounts[task.id] ?? 0,
        watch_config:
          task.type === "watch_ads"
            ? configMap.get(task.id) ?? null
            : null,
      })),
    });
  } catch (error) {
    console.error("Admin tasks GET error:", error);

    return NextResponse.json(
      { error: "Unable to load admin tasks." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminPermission("manage_tasks"))) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const title =
      typeof body?.title === "string"
        ? body.title.trim()
        : "";

    const description =
      typeof body?.description === "string"
        ? body.description.trim()
        : "";

    const type =
      typeof body?.type === "string"
        ? body.type
        : "";

    const reward =
      typeof body?.reward_pp === "number"
        ? body.reward_pp
        : Number(body?.reward_pp);

    const targetUrl =
      typeof body?.target_url === "string"
        ? body.target_url.trim()
        : null;

    const proofRequired =
      body?.proof_required === true;

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    if (!isValidType(type)) {
      return NextResponse.json(
        { error: "Invalid task type." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(reward) ||
      reward <= 0 ||
      reward > 1000000
    ) {
      return NextResponse.json(
        { error: "Reward must be a positive whole number." },
        { status: 400 }
      );
    }

    if (!isValidTargetUrl(targetUrl)) {
      return NextResponse.json(
        {
          error:
            "Target URL must start with http:// or https://.",
        },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    let watchConfig: {
      provider: WatchProvider;
      ads_required: number;
      watch_duration_seconds: number;
      cooldown_seconds: number;
      pinned: boolean;
      pin_order: number | null;
    } | null = null;

    if (type === "watch_ads") {
      const configError = isValidWatchConfig(body?.watch_config);

      if (configError) {
        return NextResponse.json(
          { error: configError },
          { status: 400 }
        );
      }

      const pinned = body?.watch_config?.pinned === true;
      let pinOrder =
        body?.watch_config?.pin_order === null ||
        body?.watch_config?.pin_order === undefined
          ? null
          : Number(body.watch_config.pin_order);

      if (pinned) {
        const hasCapacity = await ensurePinCapacity(
          supabase
        );

        if (!hasCapacity) {
          return NextResponse.json(
            {
              error:
                "Only 5 Watch Ads tasks can be pinned.",
            },
            { status: 409 }
          );
        }

        if (pinOrder === null) {
          pinOrder = await getNextPinOrder(supabase);
        }
      } else {
        pinOrder = null;
      }

      watchConfig = {
        provider: body.watch_config.provider,
        ads_required: Number(body.watch_config.ads_required),
        watch_duration_seconds: Number(
          body.watch_config.watch_duration_seconds
        ),
        cooldown_seconds: Number(body.watch_config.cooldown_seconds),
        pinned,
        pin_order: pinOrder,
      };
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description,
        type,
        reward_pp: reward,
        target_url: targetUrl || null,
        proof_required: proofRequired,
        active: true,
      })
      .select(
        "id,title,description,type,reward_pp,target_url,proof_required,active,created_at,updated_at"
      )
      .single();

    if (error) {
      throw error;
    }

    if (watchConfig) {
      const { error: configError } = await supabase
        .from("watch_task_configs")
        .insert({
          task_id: task.id,
          ...watchConfig,
        });

      if (configError) {
        await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id);

        throw configError;
      }
    }

    return NextResponse.json({
      task: {
        ...task,
        completion_count: 0,
        watch_config: watchConfig,
      },
    });
  } catch (error) {
    console.error("Admin tasks POST error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to create task.",
      },
      { status: 500 }
    );
  }
}
