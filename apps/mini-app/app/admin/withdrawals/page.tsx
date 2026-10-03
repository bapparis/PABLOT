import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/admin/authorization";
import AdminWithdrawalsClient from "./AdminWithdrawalsClient";

export default async function AdminWithdrawalsPage() {
  const authenticated = await hasAdminPermission("manage_withdrawals");

  if (!authenticated) {
    redirect("/admin");
  }

  return <AdminWithdrawalsClient />;
}
