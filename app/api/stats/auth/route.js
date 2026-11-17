import { NextResponse } from "next/server";
import { authorized, cookieName, newSession, verifyPassword } from "../../../lib/stats-server";

import {staffCookie,staffSession} from '../../../lib/staff-access';

export const runtime = "nodejs";
export async function GET(request) {
  const authenticated=authorized(request);
  const response=NextResponse.json({authenticated},{headers:{"Cache-Control":"no-store"}});
  response.cookies.set(staffCookie,authenticated?staffSession(Number(request.cookies.get(cookieName).value.split(".")[0])):"",{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:authenticated?8*3600:0});
  return response;
}
export async function POST(request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 1024) return NextResponse.json({ error: "Invalid request" }, { status: 413 });
    const { password } = await request.json();
    if (!verifyPassword(password)) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(cookieName, newSession(), { httpOnly: true, secure: true, sameSite: "strict", path: "/api/stats", maxAge: 8 * 60 * 60 });
    response.cookies.set(staffCookie,staffSession(),{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:8*3600});
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch { return NextResponse.json({ error: "로그인에 실패했습니다." }, { status: 400 }); }
}
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(staffCookie,"",{httpOnly:true,secure:true,sameSite:"strict",path:"/",maxAge:0});
  response.cookies.set(cookieName, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/api/stats", maxAge: 0 });
  return response;
}
