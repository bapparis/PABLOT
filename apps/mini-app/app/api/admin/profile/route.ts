import { NextResponse } from "next/server";
import { getOwnerAccount } from "@/lib/admin/owner";
import { isOwner } from "@/lib/admin/authorization";

export async function GET() {
  try {
    if (!(await isOwner())) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const owner = await getOwnerAccount();

    if (!owner) {
      return NextResponse.json(
        { error: "Owner account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: owner.id,
      email: owner.email,
      displayName: owner.display_name,
      role: owner.role,
      isActive: owner.is_active,
      createdAt: owner.created_at,
      updatedAt: owner.updated_at,
    });
  } catch (error) {
    console.error("Admin profile GET error:", error);

    return NextResponse.json(
      { error: "Unable to load admin profile." },
      { status: 500 }
    );
  }
}
