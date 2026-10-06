import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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

export function hashOwnerPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");

  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex");

  return `scrypt$${salt}$${hash}`;
}

export function verifyOwnerPassword(
  password: string,
  storedHash: string
) {
  const parts = storedHash.split("$");

  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false;
  }

  const [, salt, expectedHash] = parts;

  if (!salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(
    password,
    salt,
    64
  );

  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualHash.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    actualHash,
    expectedBuffer
  );
}

export async function getOwnerAccount() {
  const supabase = getAdminSupabase();

  const { data, error } = await supabase
    .from("admin_accounts")
    .select(
      "id, email, display_name, password_hash, role, is_active, auth_version, created_at, updated_at"
    )
    .eq("role", "owner")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Unable to load owner account: ${error.message}`
    );
  }

  return data;
}

export async function createOrUpdateOwnerAccount({
  email,
  displayName,
  password,
}: {
  email: string;
  displayName: string;
  password: string;
}) {
  const supabase = getAdminSupabase();

  const passwordHash = hashOwnerPassword(password);

  const { data: existing, error: lookupError } =
    await supabase
      .from("admin_accounts")
      .select("id")
      .eq("role", "owner")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

  if (lookupError) {
    throw new Error(
      `Unable to check owner account: ${lookupError.message}`
    );
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from("admin_accounts")
      .update({
        email,
        display_name: displayName,
        password_hash: passwordHash,
        role: "owner",
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select(
        "id, email, display_name, role, is_active, auth_version, created_at, updated_at"
      )
      .single();

    if (error) {
      throw new Error(
        `Unable to update owner account: ${error.message}`
      );
    }

    return data;
  }

  const { data, error } = await supabase
    .from("admin_accounts")
    .insert({
      email,
      display_name: displayName,
      password_hash: passwordHash,
      role: "owner",
      is_active: true,
    })
    .select(
      "id, email, display_name, role, is_active, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new Error(
      `Unable to create owner account: ${error.message}`
    );
  }

  return data;
}
