import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminTasksClient from "./AdminTasksClient";

export default async function AdminTasksPage() {
  const authenticated = await hasAdminPermission("manage_tasks");

  if (!authenticated) {
    redirect("/admin");
  }

  return <AdminTasksClient />;
}
