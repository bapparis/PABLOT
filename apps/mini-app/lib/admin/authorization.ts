import { createClient } from "@supabase/supabase-js";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getStaffSession } from "@/lib/staff/auth";

type Permissions = Record<string, boolean>;

export type AdminIdentity =
  | {
      type: "owner";
      role: "owner";
      permissions: Permissions;
    }
  | {
      type: "staff";
      staffId: string;
      role: "admin" | "moderator" | "support";
      permissions: Permissions;
    };

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

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  if (await isAdminAuthenticated()) {
    return {
      type: "owner",
      role: "owner",
      permissions: {
        manage_staff: true,
        view_overview: true,
        manage_withdrawals: true,
        manage_tasks: true,
        manage_users: true,
        view_analytics: true,
        manage_settings: true,
        manage_maintenance: true,
        manage_payments: true,
      },
    };
  }

  const session = await getStaffSession();

  if (!session) {
    return null;
  }

  const supabase = getAdminSupabase();

  const { data: staff, error } = await supabase
    .from("admin_staff")
    .select("id,role,status,permissions")
    .eq("id", session.staffId)
    .maybeSingle();

  if (error || !staff || staff.status !== "active") {
    return null;
  }

  if (
    staff.role !== "admin" &&
    staff.role !== "moderator" &&
    staff.role !== "support"
  ) {
    return null;
  }

  return {
    type: "staff",
    staffId: staff.id,
    role: staff.role,
    permissions:
      staff.permissions && typeof staff.permissions === "object"
        ? staff.permissions
        : {},
  };
}

export async function isOwner() {
  const identity = await getAdminIdentity();
  return identity?.type === "owner";
}

export async function hasAdminPermission(permission: string) {
  const identity = await getAdminIdentity();

  if (!identity) {
    return false;
  }

  return identity.permissions[permission] === true;
}
