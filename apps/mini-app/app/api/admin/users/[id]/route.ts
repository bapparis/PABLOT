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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const allowed = await hasAdminPermission("manage_users");

  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const [
      userResult,
      completionsResult,
      transactionsResult,
      withdrawalsResult,
      walletsResult,
    ] = await Promise.all([
      supabase
        .from("users")
        .select(
          "id,telegram_id,pablot_id,username,first_name,last_name,photo_url,pp_balance,total_earned,language,notifications_enabled,created_at,updated_at"
        )
        .eq("id", id)
        .maybeSingle(),

      supabase
        .from("task_completions")
        .select(
          "id,task_id,status,proof_url,reward_pp,completed_at,created_at,updated_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("pp_transactions")
        .select(
          "id,amount,type,reference_id,description,created_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("withdrawals")
        .select(
          "id,amount_pp,gross_usd,fee_usd,net_usd,network,wallet_address,status,tx_hash,rejection_reason,created_at,updated_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),

      supabase
        .from("withdrawal_wallets")
        .select(
          "id,network,address,created_at,updated_at"
        )
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
    ]);

    if (userResult.error) {
      console.error("Admin user lookup error:", userResult.error);

      return NextResponse.json(
        { error: "Unable to load user." },
        { status: 500 }
      );
    }

    if (!userResult.data) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    if (
      completionsResult.error ||
      transactionsResult.error ||
      withdrawalsResult.error ||
      walletsResult.error
    ) {
      console.error("Admin user activity lookup error:", {
        completions: completionsResult.error,
        transactions: transactionsResult.error,
        withdrawals: withdrawalsResult.error,
        wallets: walletsResult.error,
      });

      return NextResponse.json(
        { error: "Unable to load complete user activity." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: userResult.data,
      taskCompletions: completionsResult.data ?? [],
      ppTransactions: transactionsResult.data ?? [],
      withdrawals: withdrawalsResult.data ?? [],
      wallets: walletsResult.data ?? [],
    });
  } catch (error) {
    console.error("Admin user details error:", error);

    return NextResponse.json(
      { error: "Unable to load user details." },
      { status: 500 }
    );
  }
}
