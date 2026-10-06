export type PaymentChannelStatus =
  | "PENDING"
  | "PAID"
  | "REJECTED";

interface PaymentChannelMessage {
  telegramUsername: string | null;
  pablotId: string;
  amountUsdt: number;
  network: string;
  status: PaymentChannelStatus;
  txHash?: string | null;
}

async function getPaymentChannelConfig() {
  const { getPlatformSettings } = await import("@/lib/settings/platform");

  const settings = await getPlatformSettings();

  if (!settings.paymentsChannelEnabled) {
    return null;
  }

  const channelId = settings.paymentsChannelId.trim();

  if (!channelId) {
    throw new Error(
      "Payments channel is enabled but no channel ID is configured."
    );
  }

  return channelId;
}

function getBotToken() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  }

  return botToken;
}

function formatUsername(username: string | null) {
  if (!username?.trim()) {
    return "PABLOT user";
  }

  return `@${username.trim().replace(/^@+/, "")}`;
}

function formatPaymentMessage(payment: PaymentChannelMessage) {
  const username = formatUsername(payment.telegramUsername);

  if (payment.status === "PENDING") {
    return (
      `⏳ PABLOT PAYMENT\n\n` +
      `👤 ${username}\n` +
      `🆔 ${payment.pablotId}\n\n` +
      `💰 Amount: ${payment.amountUsdt} USDT\n` +
      `🌐 Network: ${payment.network}\n` +
      `📌 Status: PENDING\n\n` +
      `Waiting for processing…`
    );
  }

  if (payment.status === "PAID") {
    const explorerLink = payment.txHash
      ? `https://bscscan.com/tx/${payment.txHash}`
      : null;

    return (
      `💸 PABLOT PAYMENT\n\n` +
      `👤 ${username}\n` +
      `🆔 ${payment.pablotId}\n\n` +
      `💰 ${payment.amountUsdt} USDT\n` +
      `🌐 ${payment.network}\n\n` +
      `✅ PAID` +
      (explorerLink
        ? `\n\n🔗 View transaction\n${explorerLink}`
        : "") +
      `\n\n#PABLOT #Payment`
    );
  }

  return (
    `❌ PABLOT PAYMENT\n\n` +
    `👤 ${username}\n` +
    `🆔 ${payment.pablotId}\n\n` +
    `💰 ${payment.amountUsdt} USDT\n` +
    `🌐 ${payment.network}\n\n` +
    `❌ REJECTED\n\n` +
    `#PABLOT #Payment`
  );
}

async function callTelegram(
  method: string,
  body: Record<string, unknown>
) {
  const botToken = getBotToken();

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const result = await response.json();

  if (!response.ok || !result?.ok) {
    throw new Error(
      `Telegram ${method} failed: ${response.status} ${JSON.stringify(
        result
      )}`
    );
  }

  return result;
}

export async function sendPaymentChannelMessage(
  payment: PaymentChannelMessage
) {
  const channelId = await getPaymentChannelConfig();

  if (!channelId) {
    return {
      messageId: null,
      channelId: null,
    };
  }

  const result = await callTelegram("sendMessage", {
    chat_id: channelId,
    text: formatPaymentMessage(payment),
    disable_web_page_preview: true,
  });

  return {
    messageId: result.result?.message_id ?? null,
    channelId,
  };
}

export async function deletePaymentChannelMessage(
  messageId: number,
  channelId?: string | null
) {
  const configuredChannelId = channelId?.trim()
    ? channelId.trim()
    : await getPaymentChannelConfig();

  if (!configuredChannelId) {
    return;
  }

  await callTelegram("deleteMessage", {
    chat_id: configuredChannelId,
    message_id: messageId,
  });
}
