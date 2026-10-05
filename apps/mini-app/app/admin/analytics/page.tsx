import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminAnalyticsClient from "./AdminAnalyticsClient";

export default async function AdminAnalyticsPage() {
  const allowed = await hasAdminPermission("view_analytics");

  if (!allowed) redirect("/admin");

  return <AdminAnalyticsClient />;
}
