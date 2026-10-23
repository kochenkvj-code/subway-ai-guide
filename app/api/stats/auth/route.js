import { NextResponse } from "next/server";
import { authorized, cookieName, newSession, verifyPassword } from "../../../lib/stats-server";

export const runtime = "nodejs";
export async function GET(request) {
  return NextResponse.json({ authenticated: authorized(request) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1024) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const { password } = await request.json();
    if (!verifyPassword(password)) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(cookieName, newSession(), { httpOnly: true, secure: true, sameSite: "strict", path: "/api/stats", maxAge: 8 * 60 * 60 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "로그인에 실패했습니다." }, { status: 400 }); }
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/api/stats", maxAge: 0 });
  return response;
}
