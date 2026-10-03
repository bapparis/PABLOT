import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const authenticated = await hasAdminPermission("view_overview");

  if (!authenticated) {
    redirect("/admin");
  }

  return <AdminDashboardClient />;
}
