import { NextResponse } from "next/server";

function extractReferral(text: string) {
  const match = text.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim() || null;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number | string,
  text: string,
  referralId: string | null
) {
  const webAppUrl = "https://pablot.vercel.app/";

  const replyMarkup = referralId
    ? {
        inline_keyboard: [
          [
            {
              text: "🚀 Open PABLOT",
              web_app: {
                url: `${webAppUrl}?startapp=${encodeURIComponent(referralId)}`,
              },
            },
          ],
        ],
      }
    : {
        inline_keyboard: [
          [
            {
              text: "🚀 Open PABLOT",
              web_app: {
                url: webAppUrl,
              },
            },
          ],
        ],
      };

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: replyMarkup,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("TELEGRAM_SEND_FAILED");
  }
}

export async function POST(request: Request) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const receivedSecret = request.headers.get(
      "X-Telegram-Bot-Api-Secret-Token"
    );

    if (!botToken || !webhookSecret) {
      return NextResponse.json(
        { error: "Telegram webhook configuration is incomplete." },
        { status: 500 }
      );
    }

    if (receivedSecret !== webhookSecret) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const update = await request.json();

    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = message?.text;

    if (!chatId || typeof text !== "string") {
      return NextResponse.json({ ok: true });
    }

    const referralId = extractReferral(text);

    if (!text.trim().match(/^\/start(?:@\w+)?(?:\s+.+)?$/i)) {
      return NextResponse.json({ ok: true });
    }

    if (referralId && /^PB-\d+$/.test(referralId)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

      if (supabaseUrl && supabaseSecretKey) {
        const pendingReferralResponse = await fetch(
          `${supabaseUrl}/rest/v1/pending_referrals`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseSecretKey,
              Authorization: `Bearer ${supabaseSecretKey}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              telegram_id: chatId,
              referral_pablot_id: referralId,
            }),
          }
        );

        if (!pendingReferralResponse.ok) {
          const errorBody = await pendingReferralResponse.text();
          console.error(
            "Pending referral storage failed:",
            pendingReferralResponse.status,
            errorBody
          );
          throw new Error("PENDING_REFERRAL_STORAGE_FAILED");
        }
      }
    }

    const welcomeText = referralId
      ? "🚀 Welcome to PABLOT!\n\nYou were invited to join PABLOT. Open the Mini App below to get started."
      : "🚀 Welcome to PABLOT!\n\nEarn PP, complete tasks, and grow your rewards.";

    await sendTelegramMessage(botToken, chatId, welcomeText, referralId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to process Telegram update." },
      { status: 500 }
    );
  }
}
