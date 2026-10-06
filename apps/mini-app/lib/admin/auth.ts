import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getOwnerAccount } from "@/lib/admin/owner";

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

  const parts = payload.split(":");

  if (
    parts.length !== 4 ||
    parts[0] !== "pablot-admin" ||
    parts[1] !== "owner"
  ) {
    return false;
  }

  const timestamp = Number(parts[2]);
  const sessionVersion = Number(parts[3]);

  if (
    !Number.isFinite(timestamp) ||
    !Number.isInteger(sessionVersion)
  ) {
    return false;
  }

  if (timestamp > Date.now() + 60 * 1000) {
    return false;
  }

  const maxAge = 12 * 60 * 60 * 1000;

  if (Date.now() - timestamp > maxAge) {
    return false;
  }

  const owner = await getOwnerAccount();

  if (!owner) {
    return false;
  }

  if (Number(owner.auth_version ?? 1) !== sessionVersion) {
    return false;
  }

  return true;
}
