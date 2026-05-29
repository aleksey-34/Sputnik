import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUrl = process.env.GOOGLE_REDIRECT_URL;

  if (!clientId || !redirectUrl) {
    return new NextResponse("Google OAuth не настроен", { status: 500 });
  }

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUrl);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "https://www.googleapis.com/auth/fitness.activity.read");
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizeUrl.toString());
}
