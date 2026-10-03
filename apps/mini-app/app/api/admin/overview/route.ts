import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

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

export async function GET() {
  try {
    if (!(await hasAdminPermission("view_overview"))) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const supabase = getAdminSupabase();

    const [
      usersResult,
      tasksResult,
      withdrawalsResult,
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id", { count: "exact", head: true }),

      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("active", true),

      supabase
        .from("withdrawals")
        .select("id,amount_pp,gross_usd,fee_usd,net_usd,status,created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (tasksResult.error) throw tasksResult.error;
    if (withdrawalsResult.error) throw withdrawalsResult.error;

    const pendingWithdrawals = withdrawalsResult.data ?? [];

    const pendingGrossUsd = pendingWithdrawals.reduce(
      (sum, withdrawal) => sum + Number(withdrawal.gross_usd),
      0
    );

    const pendingNetUsd = pendingWithdrawals.reduce(
      (sum, withdrawal) => sum + Number(withdrawal.net_usd),
      0
    );

    const pendingPp = pendingWithdrawals.reduce(
      (sum, withdrawal) => sum + Number(withdrawal.amount_pp),
      0
    );

    return NextResponse.json({
      users: usersResult.count ?? 0,
      active_tasks: tasksResult.count ?? 0,
      pending_withdrawals: pendingWithdrawals.length,
      pending_pp: pendingPp,
      pending_gross_usd: pendingGrossUsd,
      pending_net_usd: pendingNetUsd,
      recent_withdrawals: pendingWithdrawals.slice(0, 5),
    });
  } catch (error) {
    console.error("Admin overview GET error:", error);

    return NextResponse.json(
      { error: "Unable to load admin overview." },
      { status: 500 }
    );
  }
}
