import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminSettingsClient from "./AdminSettingsClient";

export default async function AdminSettingsPage() {
  const allowed = await hasAdminPermission("manage_settings");

  if (!allowed) {
    redirect("/admin/dashboard");
  }

  return <AdminSettingsClient />;
}
