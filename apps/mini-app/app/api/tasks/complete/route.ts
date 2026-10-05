import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { isMaintenanceEnabled } from "@/lib/settings/maintenance";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

function verifyTelegramInitData(
  initData: string,
  botToken: string
): TelegramUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return null;
  }

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const calculatedHashBuffer = Buffer.from(
    calculatedHash,
    "hex"
  );

  const receivedHashBuffer = Buffer.from(
    hash,
    "hex"
  );

  if (
    receivedHashBuffer.length !== calculatedHashBuffer.length ||
    !crypto.timingSafeEqual(
      calculatedHashBuffer,
      receivedHashBuffer
    )
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));

  if (
    !authDate ||
    Math.abs(Date.now() / 1000 - authDate) > 86400
  ) {
    return null;
  }

  const userRaw = params.get("user");

  if (!userRaw) {
    return null;
  }

  try {
    return JSON.parse(userRaw) as TelegramUser;
  } catch {
    return null;
  }
}

async function verifyChannelMembership(
  botToken: string,
  telegramUserId: number,
  targetUrl: string | null
) {
  if (!targetUrl) {
    return false;
  }

  let username = "";

  try {
    const url = new URL(targetUrl);

    if (url.hostname !== "t.me") {
      return false;
    }

    username = url.pathname
      .replace(/^\/+/, "")
      .split("/")[0]
      .replace(/^@/, "");
  } catch {
    return false;
  }

  if (!username) {
    return false;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${encodeURIComponent(username)}&user_id=${telegramUserId}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!data.ok) {
    return false;
  }

  const status = data.result?.status;

  return (
    status === "creator" ||
    status === "administrator" ||
    status === "member" ||
    status === "restricted"
  );
}

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();

    const initData = body?.initData;
    const taskId = body?.taskId;

    if (
      typeof initData !== "string" ||
      !initData ||
      typeof taskId !== "string" ||
      !taskId
    ) {
      return NextResponse.json(
        { error: "initData and taskId are required." },
        { status: 400 }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (
      !botToken ||
      !supabaseUrl ||
      !supabaseSecretKey
    ) {
      return NextResponse.json(
        { error: "Server configuration is incomplete." },
        { status: 500 }
      );
    }

    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    if (
      !telegramUser?.id ||
      !telegramUser.first_name
    ) {
      return NextResponse.json(
        { error: "Invalid Telegram authentication data." },
        { status: 401 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseSecretKey
    );

    const { data: task, error: taskError } =
      await supabase
        .from("tasks")
        .select(
          "id, title, type, reward_pp, target_url, active"
        )
        .eq("id", taskId)
        .maybeSingle();

    if (taskError) {
      return NextResponse.json(
        { error: taskError.message },
        { status: 500 }
      );
    }

    if (!task || !task.active) {
      return NextResponse.json(
        { error: "Task is not available." },
        { status: 404 }
      );
    }

    if (task.type === "join_channel") {
      const isMember = await verifyChannelMembership(
        botToken,
        telegramUser.id,
        task.target_url
      );

      if (!isMember) {
        return NextResponse.json(
          {
            error:
              "You have not joined the required Telegram channel yet.",
            code: "NOT_A_MEMBER",
          },
          { status: 403 }
        );
      }
    }

    const { data: user, error: userError } =
      await supabase
        .from("users")
        .select("id")
        .eq("telegram_id", telegramUser.id)
        .maybeSingle();

    if (userError) {
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "PABLOT account not found." },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.rpc(
      "complete_task_and_reward",
      {
        p_user_id: user.id,
        p_task_id: taskId,
      }
    );

    if (error) {
      if (
        error.message.includes(
          "TASK_NOT_AVAILABLE"
        )
      ) {
        return NextResponse.json(
          { error: "Task is not available." },
          { status: 404 }
        );
      }

      if (
        error.message.includes(
          "TASK_ALREADY_COMPLETED"
        )
      ) {
        return NextResponse.json(
          { error: "Task already completed." },
          { status: 409 }
        );
      }

      if (
        error.message.includes(
          "USER_NOT_FOUND"
        )
      ) {
        return NextResponse.json(
          { error: "PABLOT account not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const result = Array.isArray(data)
      ? data[0]
      : data;

    // Check whether this user was referred and update qualification progress.
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, status")
      .eq("referred_user_id", user.id)
      .maybeSingle();

    if (referral && referral.status === "pending") {
      const { error: qualificationError } = await supabase.rpc(
        "qualify_referral_and_reward",
        {
          p_referral_id: referral.id,
        }
      );

      if (qualificationError) {
        console.error(
          "Referral qualification error:",
          qualificationError
        );
      }
    }

    return NextResponse.json({
      success: true,
      reward_pp: result.reward_pp,
      pp_balance: result.pp_balance,
      total_earned: result.total_earned,
      completion_id: result.completion_id,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }
}
