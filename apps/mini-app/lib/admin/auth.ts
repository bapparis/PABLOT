import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "pablot_admin_session";

export async function isAdminAuthenticated() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const separator = token.lastIndexOf(".");

  if (separator === -1) {
    return false;
  }

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return false;
  }

  const prefix = "pablot-admin:owner:";

  if (!payload.startsWith(prefix)) {
    return false;
  }

  const timestamp = Number(
    payload.slice(prefix.length)
  );

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const maxAge = 12 * 60 * 60 * 1000;

  if (Date.now() - timestamp > maxAge) {
    return false;
  }

  if (timestamp > Date.now() + 60 * 1000) {
    return false;
  }

  return true;
}
