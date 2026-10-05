export async function sendReferralQualifiedNotification(
  botToken: string,
  chatId: number | string,
  username: string | null,
  rewardPp: number
) {
  const userLabel =
    username && username.trim()
      ? `@${username.trim().replace(/^@+/, "")}`
      : "The new PABLOT user";

  const text =
    `🎯 Referral qualified!\n\n` +
    `${userLabel} has completed the referral requirements.\n\n` +
    `💰 +${rewardPp} PP added to your rewards.\n\n` +
    `Keep growing your PABLOT network! 🚀`;

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
      }),
    }
  );

  if (!response.ok) {
    console.error(
      "Referral qualification notification failed:",
      response.status,
      await response.text()
    );
  }
}
