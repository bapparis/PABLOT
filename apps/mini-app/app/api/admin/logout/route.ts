import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
  });

  const cookieOptions = {
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set({
    name: "pablot_admin_session",
    ...cookieOptions,
  });

  response.cookies.set({
    name: "pablot_staff_session",
    ...cookieOptions,
  });

  return response;
}
