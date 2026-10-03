import { redirect } from "next/navigation";
import { isOwner } from "@/lib/admin/authorization";
import AdminStaffClient from "./AdminStaffClient";

export default async function AdminStaffPage() {
  const owner = await isOwner();

  if (!owner) {
    redirect("/admin");
  }

  return <AdminStaffClient />;
}
