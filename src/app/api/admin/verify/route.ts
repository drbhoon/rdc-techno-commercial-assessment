import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin@rdc2026";

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password: string };
  if (password === ADMIN_PASSWORD) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });
}
