import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminUserDetailsClient from "./AdminUserDetailsClient";

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const allowed = await hasAdminPermission("manage_users");

  if (!allowed) {
    redirect("/admin");
  }

  const { id } = await params;

  return <AdminUserDetailsClient userId={id} />;
}
