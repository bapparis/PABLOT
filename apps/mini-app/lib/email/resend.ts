import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

function getFromEmail() {
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  return fromEmail;
}

export async function sendPablotSecurityEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  const from = getFromEmail();

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(
      `Unable to send security email: ${error.message}`
    );
  }

  return data;
}
