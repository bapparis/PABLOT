import { NextResponse } from "next/server";
import { getAdminIdentity } from "@/lib/admin/authorization";

export async function GET() {
  const identity = await getAdminIdentity();

  if (!identity) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    type: identity.type,
    role: identity.role,
    permissions: identity.permissions,
  });
}
