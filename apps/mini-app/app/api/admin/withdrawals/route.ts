import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { hasAdminPermission } from "@/lib/admin/authorization";
import {
  deletePaymentChannelMessage,
  sendPaymentChannelMessage,
} from "@/lib/telegram/payment";

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
async function publishWithdrawalPaymentUpdate(
  supabase: ReturnType<typeof getAdminSupabase>,
  withdrawalId: string,
  status: "PAID" | "REJECTED",
  txHash?: string | null
) {
  try {
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select(
        "id, net_usd, network, payment_channel_id, payment_channel_message_id, users(username, pablot_id)"
      )
      .eq("id", withdrawalId)
      .maybeSingle();

    if (withdrawalError) {
      console.error(
        "Payment channel withdrawal lookup error:",
        withdrawalError
      );
      return;
    }

    if (!withdrawal) {
      console.error(
        "Payment channel withdrawal not found:",
        withdrawalId
      );
      return;
    }

    const user = Array.isArray(withdrawal.users)
      ? withdrawal.users[0]
      : withdrawal.users;

    if (!user?.pablot_id) {
      console.error(
        "Payment channel user data is missing:",
        withdrawalId
      );
      return;
    }

    const paymentMessage = await sendPaymentChannelMessage({
      telegramUsername: user.username ?? null,
      pablotId: user.pablot_id,
      amountUsdt: Number(withdrawal.net_usd ?? 0),
      network: String(withdrawal.network ?? "BSC").toUpperCase(),
      status,
      txHash: txHash ?? null,
    });

    if (!paymentMessage.messageId) {
      return;
    }

    if (withdrawal.payment_channel_message_id) {
      try {
        await deletePaymentChannelMessage(
          Number(withdrawal.payment_channel_message_id),
          withdrawal.payment_channel_id
        );
      } catch (deleteError) {
        console.error(
          "Payment channel pending message deletion error:",
          deleteError
        );
      }
    }

    const { error: saveError } = await supabase
      .from("withdrawals")
      .update({
        payment_channel_id: paymentMessage.channelId,
        payment_channel_message_id: paymentMessage.messageId,
      })
      .eq("id", withdrawalId);

    if (saveError) {
      console.error(
        "Payment channel message update error:",
        saveError
      );
    }
  } catch (paymentError) {
    console.error(
      "Payment channel status update error:",
      paymentError
    );
  }
}

export async function GET(request: NextRequest) {
  if (!(await hasAdminPermission("manage_withdrawals"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminSupabase();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get("status");

  const requestedPage = Number(searchParams.get("page") ?? "1");
  const requestedLimit = Number(searchParams.get("limit") ?? "25");

  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;

  const limit =
    Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 100)
      : 25;

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("withdrawals")
    .select(`
      id,
      user_id,
      amount_pp,
      gross_usd,
      fee_usd,
      net_usd,
      network,
      wallet_address,
      status,
      tx_hash,
      rejection_reason,
      payment_channel_id,
      payment_channel_message_id,
      created_at,
      updated_at,
      users (
        id,
        telegram_id,
        username,
        pablot_id
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (
    status &&
    ["pending", "approved", "paid", "rejected"].includes(status)
  ) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("Admin withdrawals GET error:", error);
    return NextResponse.json(
      { error: "Failed to load withdrawals" },
      { status: 500 }
    );
  }

  const total = count ?? 0;

  return NextResponse.json({
    withdrawals: data ?? [],
    pagination: {
      page,
      limit,
      total,
      has_more: page * limit < total,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await hasAdminPermission("manage_withdrawals"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    action?: string;
    withdrawal_id?: string;
    reason?: string;
    tx_hash?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const supabase = getAdminSupabase();
  const withdrawalId = body.withdrawal_id?.trim();

  if (!withdrawalId) {
    return NextResponse.json(
      { error: "Withdrawal ID is required" },
      { status: 400 }
    );
  }

  if (body.action === "approve") {
    const { data, error } = await supabase.rpc(
      "admin_approve_withdrawal",
      {
        p_withdrawal_id: withdrawalId,
      }
    );

    if (error) {
      console.error("Admin withdrawal approval error:", error);

      const message = error.message ?? "";

      if (message.includes("WITHDRAWAL_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Withdrawal not found" },
          { status: 404 }
        );
      }

      if (message.includes("WITHDRAWAL_NOT_PENDING")) {
        return NextResponse.json(
          { error: "Withdrawal is no longer pending" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to approve withdrawal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      withdrawal: data,
    });
  }

  if (body.action === "reject") {
    const reason = body.reason?.trim();

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "admin_reject_withdrawal",
      {
        p_withdrawal_id: withdrawalId,
        p_reason: reason,
      }
    );

    if (error) {
      console.error("Admin withdrawal rejection error:", error);

      const message = error.message ?? "";

      if (message.includes("WITHDRAWAL_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Withdrawal not found" },
          { status: 404 }
        );
      }

      if (message.includes("WITHDRAWAL_NOT_PENDING")) {
        return NextResponse.json(
          { error: "Withdrawal is no longer pending" },
          { status: 409 }
        );
      }

      if (message.includes("USER_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Withdrawal user not found" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to reject withdrawal" },
        { status: 500 }
      );
    }

    await publishWithdrawalPaymentUpdate(
      supabase,
      withdrawalId,
      "REJECTED"
    );

    return NextResponse.json({
      withdrawal: data,
    });
  }

  if (body.action === "paid") {
    const txHash = body.tx_hash?.trim();

    if (!txHash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "admin_mark_withdrawal_paid",
      {
        p_withdrawal_id: withdrawalId,
        p_tx_hash: txHash,
      }
    );

    if (error) {
      console.error("Admin withdrawal paid error:", error);

      const message = error.message ?? "";

      if (message.includes("WITHDRAWAL_NOT_FOUND")) {
        return NextResponse.json(
          { error: "Withdrawal not found" },
          { status: 404 }
        );
      }

      if (message.includes("WITHDRAWAL_NOT_APPROVED")) {
        return NextResponse.json(
          { error: "Withdrawal must be approved before marking it paid" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to mark withdrawal as paid" },
        { status: 500 }
      );
    }

    await publishWithdrawalPaymentUpdate(
      supabase,
      withdrawalId,
      "PAID",
      txHash
    );

    return NextResponse.json({
      withdrawal: data,
    });
  }

  return NextResponse.json(
    { error: "Invalid withdrawal action" },
    { status: 400 }
  );
}
