import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const allowed = await hasAdminPermission("manage_users");

  if (!allowed) {
    redirect("/admin");
  }

  return <AdminUsersClient />;
}
