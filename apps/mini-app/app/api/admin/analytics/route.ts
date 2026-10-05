import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}

export async function GET() {
  const allowed = await hasAdminPermission("view_analytics");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getAdminSupabase();

  const [summaryResult, allTimeResult] = await Promise.all([
    supabase.rpc("get_all_time_summary"),
    supabase.rpc("get_all_time_analytics"),
  ]);

  if (summaryResult.error || allTimeResult.error) {
    return NextResponse.json(
      { error: "Unable to load analytics data." },
      { status: 500 }
    );
  }

  const summaryData = summaryResult.data ?? {};

  const allTime = allTimeResult.data ?? {
    users: [],
    tasks: [],
    pp: [],
    revenue: [],
  };

  const totalExternalRevenue = Number(
    summaryData.externalRevenue ?? 0
  );

  const totalWithdrawalFees = Number(
    summaryData.withdrawalFees ?? 0
  );

  const totalMoneyOut = Number(
    summaryData.moneyOut ?? 0
  );

  const totalGrossWithdrawals = Number(
    summaryData.grossWithdrawals ?? 0
  );

  return NextResponse.json({
    summary: {
      totalUsers: Number(summaryData.totalUsers ?? 0),
      totalPpBalance: Number(summaryData.totalPpBalance ?? 0),
      totalEarned: Number(summaryData.totalEarned ?? 0),
      totalPpIssued: Number(summaryData.totalPpIssued ?? 0),
      totalPpSpent: Number(summaryData.totalPpSpent ?? 0),
      totalTaskCompletions: Number(
        summaryData.totalTaskCompletions ?? 0
      ),

      pendingWithdrawals: Number(
        summaryData.pendingWithdrawals ?? 0
      ),

      approvedWithdrawals: Number(
        summaryData.approvedWithdrawals ?? 0
      ),

      paidWithdrawals: Number(
        summaryData.paidWithdrawals ?? 0
      ),

      rejectedWithdrawals: Number(
        summaryData.rejectedWithdrawals ?? 0
      ),

      revenue: totalExternalRevenue + totalWithdrawalFees,
      externalRevenue: totalExternalRevenue,
      withdrawalFees: totalWithdrawalFees,
      moneyOut: totalMoneyOut,
      grossWithdrawals: totalGrossWithdrawals,

      netRevenue:
        totalExternalRevenue +
        totalWithdrawalFees -
        totalMoneyOut,
    },

    allTime,

    // Temporary compatibility for the existing dashboard.
    usersLast7Days: allTime.users,
    tasksLast7Days: allTime.tasks,
    revenueLast30Days: allTime.revenue,
  });
}
