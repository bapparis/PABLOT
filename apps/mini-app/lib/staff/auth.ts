import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "pablot_staff_session";
const SESSION_MAX_AGE = 12 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured.");
  return secret;
}

export function hashStaffPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyStaffPassword(password: string, storedHash: string) {
  const parts = storedHash.split(":");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHash] = parts;

  try {
    const actualHash = crypto.scryptSync(password, salt, 64).toString("hex");

    const expected = Buffer.from(expectedHash, "hex");
    const actual = Buffer.from(actualHash, "hex");

    if (expected.length !== actual.length) return false;

    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createStaffSession(staffId: string) {
  const payload = `pablot-staff:${staffId}:${Date.now()}`;
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

export async function setStaffSession(staffId: string) {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, createStaffSession(staffId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE / 1000,
  });
}

export async function clearStaffSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getStaffSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const signatureIndex = token.lastIndexOf(".");

  if (signatureIndex === -1) return null;

  const payload = token.slice(0, signatureIndex);
  const signature = token.slice(signatureIndex + 1);

  const expectedSignature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");

  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }

  const parts = payload.split(":");

  if (parts.length !== 3 || parts[0] !== "pablot-staff") {
    return null;
  }

  const staffId = parts[1];
  const timestamp = Number(parts[2]);

  if (!staffId || !Number.isFinite(timestamp)) {
    return null;
  }

  const now = Date.now();

  if (now - timestamp > SESSION_MAX_AGE) {
    return null;
  }

  if (timestamp > now + 60_000) {
    return null;
  }

  return {
    staffId,
    createdAt: timestamp,
  };
}
