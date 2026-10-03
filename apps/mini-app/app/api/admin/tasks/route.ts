import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

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
    }

    return NextResponse.json({
      tasks: (tasks ?? []).map((task) => ({
        ...task,
        completion_count:
          completionCounts[task.id] ?? 0,
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

    const allowedTypes = [
      "join_channel",
      "follow",
      "visit",
      "watch",
      "social",
      "custom",
    ];

    if (!title) {
      return NextResponse.json(
        { error: "Task title is required." },
        { status: 400 }
      );
    }

    if (!allowedTypes.includes(type)) {
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

    if (
      targetUrl &&
      !/^https?:\/\//i.test(targetUrl)
    ) {
      return NextResponse.json(
        { error: "Target URL must start with http:// or https://." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

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

    return NextResponse.json({
      task: {
        ...task,
        completion_count: 0,
      },
    });
  } catch (error) {
    console.error("Admin tasks POST error:", error);

    return NextResponse.json(
      { error: "Unable to create task." },
      { status: 500 }
    );
  }
}
