import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

const allowedTypes = [
  "join_channel",
  "follow",
  "visit",
  "watch",
  "social",
  "custom",
] as const;

type TaskType = (typeof allowedTypes)[number];

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

function isValidType(value: unknown): value is TaskType {
  return (
    typeof value === "string" &&
    allowedTypes.includes(value as TaskType)
  );
}

function isValidTargetUrl(value: string | null) {
  if (!value) return true;
  return /^https?:\/\//i.test(value);
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

    const updates: Record<string, unknown> = {};

    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title.trim()) {
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
          { error: "Reward must be an integer between 1 and 1,000,000 PP." },
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
          { error: "Target URL must start with http:// or https://." },
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

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select(
        "id,title,description,type,reward_pp,target_url,proof_required,active,created_at,updated_at"
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Task not found." },
          { status: 404 }
        );
      }

      console.error("Admin task update error:", error);

      return NextResponse.json(
        { error: "Failed to update task." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      task: data,
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

    const { count, error: countError } = await supabase
      .from("task_completions")
      .select("id", { count: "exact", head: true })
      .eq("task_id", id);

    if (countError) {
      console.error("Admin completion count error:", countError);

      return NextResponse.json(
        { error: "Failed to check task history." },
        { status: 500 }
      );
    }

    if ((count ?? 0) > 0) {
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
