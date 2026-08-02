import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/dbPool";
import { checkAuth } from "@/lib/adminAuth";


export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const pool = getPool();
  const res = await pool.query("DELETE FROM rdc_sessions WHERE id = $1", [id]);
  if (res.rowCount === 0) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
