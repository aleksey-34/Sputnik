import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export function isAdminRequest(request: NextRequest) {
  const headerKey = request.headers.get("x-admin-key");
  const cookieKey = request.cookies.get("sputnik_admin")?.value;
  const expected = process.env.ADMIN_API_KEY ?? "";

  if (!expected) return false;

  for (const candidate of [headerKey, cookieKey]) {
    if (!candidate) continue;
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }

  return false;
}
