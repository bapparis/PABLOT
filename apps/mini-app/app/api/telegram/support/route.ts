import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const WEB_APP_URL = "https://t.me/PABLOTX_bot";

async function sendMessage(
  token: string,
  chatId: number,
  text: string
) {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("TELEGRAM_SEND_FAILED");
  }
}

async function getUser(telegramId: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("users")
    .select(
      "id,pablot_id,username,pp_balance,total_earned"
    )
    .eq("telegram_id", telegramId)
    .maybeSingle();

  if (error) {
    console.error("Support user lookup failed:", error);
    return null;
  }

  return data;
}


async function isSupportAdmin(
  token: string,
  chatId: number,
  telegramId: number
) {
  const supportChatId = Number(process.env.PABLOT_SUPPORT_CHAT_ID);

  if (!supportChatId || chatId !== supportChatId) return false;

  const response = await fetch(
    `https://api.telegram.org/bot${token}/getChatMember?chat_id=${chatId}&user_id=${telegramId}`
  );

  if (!response.ok) return false;

  const data = await response.json();
  const status = data?.result?.status;

  return status === "administrator" || status === "creator";
}

export async function POST(request: Request) {
  try {
    const token = process.env.PABLOT_SUPPORT_BOT_TOKEN;
    const secret = process.env.PABLOT_SUPPORT_WEBHOOK_SECRET;

    if (!token || !secret) {
      return NextResponse.json(
        { error: "Support bot configuration is incomplete." },
        { status: 500 }
      );
    }

    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const update = await request.json();
    const message = update?.message;
    const chatId = message?.chat?.id;
    const telegramId = message?.from?.id;
    const text = message?.text;

    if (
      typeof chatId !== "number" ||
      typeof telegramId !== "number" ||
      typeof text !== "string"
    ) {
      return NextResponse.json({ ok: true });
    }

    const command = text.trim().split(/\s+/)[0].toLowerCase();

    const user = await getUser(telegramId);

    if (command === "/id") {
      await sendMessage(token, chatId, `Chat ID: ${chatId}`);
    } else if (command === "/reply") {
      const isAdmin = await isSupportAdmin(token, chatId, telegramId);

      if (!isAdmin) {
        await sendMessage(token, chatId, "❌ This command is only available to PABLOT Support administrators.");
      } else {
        const parts = text.trim().split(/\s+/);
        const ticketRef = parts[1]?.toUpperCase();
        const replyText = parts.slice(2).join(" ").trim();

        if (!ticketRef || !/^PB-\d+$/.test(ticketRef) || !replyText) {
          await sendMessage(
            token,
            chatId,
            "Usage:\n/reply PB-123 Your message to the user"
          );
        } else {
          const ticketNumber = Number(ticketRef.slice(3));
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SECRET_KEY;

          if (!supabaseUrl || !supabaseKey) {
            await sendMessage(token, chatId, "❌ Support database is unavailable.");
          } else {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const { data: ticket } = await supabase
              .from("support_tickets")
              .select("id,ticket_number,telegram_id,status")
              .eq("ticket_number", ticketNumber)
              .maybeSingle();

            if (!ticket) {
              await sendMessage(token, chatId, `❌ Ticket ${ticketRef} was not found.`);
            } else if (ticket.status === "closed") {
              await sendMessage(token, chatId, `❌ Ticket ${ticketRef} is already closed.`);
            } else {
              const { error: messageError } = await supabase
                .from("support_messages")
                .insert({
                  ticket_id: ticket.id,
                  sender_type: "support",
                  sender_telegram_id: telegramId,
                  message: replyText,
                });

              if (messageError) {
                console.error("Support reply creation failed:", messageError);
                await sendMessage(token, chatId, "❌ Failed to save the reply.");
              } else {
                await supabase
                  .from("support_tickets")
                  .update({
                    status: "in_progress",
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", ticket.id);

                await sendMessage(
                  token,
                  ticket.telegram_id,
                  `🛠️ PABLOT Support

🎫 Ticket #PB-${ticket.ticket_number}

${replyText}

If you need further help, reply here or use /support.

Powered by BAGLOT`
                );

                await sendMessage(
                  token,
                  chatId,
                  `✅ Reply sent to #PB-${ticket.ticket_number}.`
                );
              }
            }
          }
        }
      }
    } else if (command === "/close") {
      const isAdmin = await isSupportAdmin(token, chatId, telegramId);

      if (!isAdmin) {
        await sendMessage(token, chatId, "❌ This command is only available to PABLOT Support administrators.");
      } else {
        const parts = text.trim().split(/\s+/);
        const ticketRef = parts[1]?.toUpperCase();

        if (!ticketRef || !/^PB-\d+$/.test(ticketRef)) {
          await sendMessage(
            token,
            chatId,
            "Usage:\n/close PB-123"
          );
        } else {
          const ticketNumber = Number(ticketRef.slice(3));
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_SECRET_KEY;

          if (!supabaseUrl || !supabaseKey) {
            await sendMessage(token, chatId, "❌ Support database is unavailable.");
          } else {
            const supabase = createClient(supabaseUrl, supabaseKey);

            const { data: ticket } = await supabase
              .from("support_tickets")
              .select("id,ticket_number,telegram_id,status")
              .eq("ticket_number", ticketNumber)
              .maybeSingle();

            if (!ticket) {
              await sendMessage(token, chatId, `❌ Ticket ${ticketRef} was not found.`);
            } else if (ticket.status === "closed") {
              await sendMessage(token, chatId, `ℹ️ Ticket ${ticketRef} is already closed.`);
            } else {
              const { error } = await supabase
                .from("support_tickets")
                .update({
                  status: "closed",
                  closed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("id", ticket.id);

              if (error) {
                console.error("Support ticket close failed:", error);
                await sendMessage(token, chatId, "❌ Failed to close the ticket.");
              } else {
                await supabase
                  .from("support_messages")
                  .insert({
                    ticket_id: ticket.id,
                    sender_type: "support",
                    sender_telegram_id: telegramId,
                    message: "Ticket closed by support.",
                  });

                await sendMessage(
                  token,
                  ticket.telegram_id,
                  `✅ PABLOT Support

🎫 Ticket #PB-${ticket.ticket_number} has been closed.

If you need further assistance, use /support again.

Powered by BAGLOT`
                );

                await sendMessage(
                  token,
                  chatId,
                  `✅ Ticket #PB-${ticket.ticket_number} closed.`
                );
              }
            }
          }
        }
      }
    } else if (command === "/start") {
      await sendMessage(
        token,
        chatId,
        `🤖 PABLOT Support

Hello${user?.username ? ` @${user.username}` : ""}!

I'm the PABLOT Support Bot. I can help you with your account, tasks, PP, referrals and withdrawals.

Available commands:

💰 /balance
🎯 /tasks
💳 /withdrawal
👥 /referrals
👤 /account
🛠️ /support
ℹ️ /help

Open PABLOT:
${WEB_APP_URL}

Powered by BAGLOT`
      );
    } else if (command === "/help") {
      await sendMessage(
        token,
        chatId,
        `🛠️ PABLOT Support Commands

/balance — Check your PP balance
/tasks — Learn about tasks and rewards
/withdrawal — Withdrawal help
/referrals — Referral information
/account — View your PABLOT account
/support — Contact human support

If you have a technical problem, use /support.`
      );
    } else if (command === "/balance") {
      if (!user) {
        await sendMessage(
          token,
          chatId,
          "❌ I couldn't find a PABLOT account linked to this Telegram account.\n\nOpen PABLOT first and complete your account setup."
        );
      } else {
        await sendMessage(
          token,
          chatId,
          `💰 Your PABLOT Balance

PP Balance: ${(user.pp_balance ?? 0).toLocaleString()} PP
Total Earned: ${(user.total_earned ?? 0).toLocaleString()} PP

Open PABLOT:
${WEB_APP_URL}`
        );
      }
    } else if (command === "/tasks") {
      await sendMessage(
        token,
        chatId,
        `🎯 PABLOT Tasks

Complete available tasks to earn PP.

Task types may include:
• 📺 Watch Ads
• 📢 Join channels
• 👀 Visit pages
• 🎬 Other sponsored activities

Rewards are credited after successful verification.

Open PABLOT:
${WEB_APP_URL}`
      );
    } else if (command === "/withdrawal") {
      await sendMessage(
        token,
        chatId,
        `💳 Withdrawals

You can manage your withdrawal wallet and submit withdrawals from the PABLOT Mini App.

Open PABLOT:
${WEB_APP_URL}

If your withdrawal is already pending, use /support for assistance.`
      );
    } else if (command === "/referrals") {
      await sendMessage(
        token,
        chatId,
        `👥 Referrals

Invite users to PABLOT using your referral link.

Referral rewards are credited when the required referral milestones are completed.

Open PABLOT:
${WEB_APP_URL}`
      );
    } else if (command === "/account") {
      if (!user) {
        await sendMessage(
          token,
          chatId,
          "❌ No PABLOT account was found for this Telegram account."
        );
      } else {
        await sendMessage(
          token,
          chatId,
          `👤 Your PABLOT Account

PABLOT ID: ${user.pablot_id ?? "Not assigned"}
Username: ${user.username ? `@${user.username}` : "Not set"}

PP Balance: ${(user.pp_balance ?? 0).toLocaleString()} PP

Open PABLOT:
${WEB_APP_URL}`
        );
      }
    } else if (command === "/support") {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY;

      if (!supabaseUrl || !supabaseKey) {
        await sendMessage(
          token,
          chatId,
          "❌ Support is temporarily unavailable. Please try again later."
        );
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: existingTicket } = await supabase
          .from("support_tickets")
          .select("ticket_number")
          .eq("telegram_id", telegramId)
          .eq("status", "open")
          .is("subject", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingTicket) {
          await sendMessage(
            token,
            chatId,
            `🛠️ You already have a support request waiting for your message.

🎫 Ticket #PB-${existingTicket.ticket_number}

Please send your problem in your next message.`
          );
        } else {
          const { data: ticket, error: ticketError } = await supabase
            .from("support_tickets")
            .insert({
              user_id: user?.id ?? null,
              telegram_id: telegramId,
              pablot_id: user?.pablot_id ?? null,
              username: user?.username ?? null,
              status: "open",
            })
            .select("id,ticket_number")
            .single();

          if (ticketError || !ticket) {
            console.error("Support ticket creation failed:", ticketError);
            await sendMessage(
              token,
              chatId,
              "❌ I couldn't create your support request. Please try again."
            );
          } else {
            await sendMessage(
              token,
              chatId,
              `🛠️ Human Support

Please describe your problem in your next message.

Include:
• What happened
• What you were trying to do
• Any error message you saw

🎫 Ticket #PB-${ticket.ticket_number}

Our support team will review your request.`
            );
          }
        }
      }
    } else if (!text.trim().startsWith("/")) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SECRET_KEY;

      if (!supabaseUrl || !supabaseKey) {
        await sendMessage(
          token,
          chatId,
          "❌ Support is temporarily unavailable. Please try again later."
        );
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: ticket } = await supabase
          .from("support_tickets")
          .select("id,ticket_number,pablot_id,username")
          .eq("telegram_id", telegramId)
          .eq("status", "open")
          .is("subject", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ticket) {
          const { error: messageError } = await supabase
            .from("support_messages")
            .insert({
              ticket_id: ticket.id,
              sender_type: "user",
              sender_telegram_id: telegramId,
              message: text.trim(),
            });

          if (messageError) {
            console.error("Support message creation failed:", messageError);
            await sendMessage(
              token,
              chatId,
              "❌ I couldn't send your support request. Please try again."
            );
          } else {
            await supabase
              .from("support_tickets")
              .update({
                subject: text.trim().slice(0, 120),
                updated_at: new Date().toISOString(),
              })
              .eq("id", ticket.id);

            const supportChatId = process.env.PABLOT_SUPPORT_CHAT_ID;

            if (supportChatId) {
              await sendMessage(
                token,
                Number(supportChatId),
                `🎫 NEW SUPPORT TICKET

#PB-${ticket.ticket_number}

👤 User: ${ticket.username ? `@${ticket.username}` : "No username"}
🆔 PABLOT ID: ${ticket.pablot_id ?? "Not linked"}
📱 Telegram ID: ${telegramId}

💬 Message:
${text.trim()}

🟡 Status: OPEN`
              );
            }

            await sendMessage(
              token,
              chatId,
              `✅ Support request received.

🎫 Ticket #PB-${ticket.ticket_number}

Our support team has received your message and will review it.`
            );
          }
        } else {
          await sendMessage(
            token,
            chatId,
            "🤖 I didn't recognize that command.\n\nUse /help to see the available PABLOT Support commands."
          );
        }
      }
    } else {
      await sendMessage(
        token,
        chatId,
        "🤖 I didn't recognize that command.\n\nUse /help to see the available PABLOT Support commands."
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PABLOT support webhook error:", error);

    return NextResponse.json(
      { error: "Unable to process support update." },
      { status: 500 }
    );
  }
}
