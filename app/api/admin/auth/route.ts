import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const key = String(body.key ?? "");

  if (!process.env.ADMIN_API_KEY || key !== process.env.ADMIN_API_KEY) {
    return new NextResponse("Неверный ключ", { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("sputnik_admin", key, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("sputnik_admin");
  return response;
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(request) });
}
