import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/dbPool";
import { findFinishedSession, getSession, updateSession } from "@/lib/db";
import { finaliseSession } from "@/lib/finalise";
import { checkAuth } from "@/lib/adminAuth";
import { sendRetakeEmail, smtpConfigured } from "@/lib/mailer";

/**
 * Where the candidate opens the paper. APP_URL is set on the platform
 * (https://hr.rdcc.ai/techno); without it — Railway, local — the address the
 * admin is using is the right one.
 */
function paperLink(req: NextRequest, type: string): string {
  let base = (process.env.APP_URL || "").replace(/\/$/, "");
  if (!base) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
    const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    base = `${proto}://${host}${process.env.BASE_PATH || ""}`;
  }
  return `${base}/?type=${encodeURIComponent(type)}`;
}


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

/**
 * POST /api/admin/sessions/:id — the two things HR needs to do to an attempt.
 *
 *   { action: "finalise" }     close it now and publish what was answered
 *   { action: "allow-retake" } release the candidate to sit the paper again,
 *                              and e-mail them the paper's link
 *
 * Finalise exists for the attempt whose candidate has clearly gone — a power
 * cut, a closed laptop — but whose two-hour window has not run out yet, so the
 * automatic sweep has not reached it. It evaluates whatever was saved.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };

  const session = await getSession(id);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  if (body.action === "finalise") {
    try {
      const result = await finaliseSession(id);
      return NextResponse.json({
        ok: true,
        ...result,
        message:
          result.status === "expired"
            ? "Nothing was answered, so there is no report to publish. Marked expired."
            : `Closed with ${result.answered} answer(s)${result.evaluated ? `, ${result.evaluated} newly evaluated` : ""}.`,
      });
    } catch (err) {
      console.error("[admin finalise]", err);
      return NextResponse.json({ error: "Could not finalise this attempt." }, { status: 500 });
    }
  }

  if (body.action === "allow-retake") {
    const who = session.candidate.name || session.candidate.employeeId;
    const paper = session.assessmentType === "selling" ? "Selling Skill" : "Technical Skill";
    const link = paperLink(req, session.assessmentType);
    // Pressing it again on a released row re-sends the link rather than
    // moving the release date.
    session.retakeAllowedAt ??= new Date().toISOString();
    await updateSession(session);
    // A later finished attempt would still block the new sitting, whichever
    // row HR pressed — so release every finished attempt at this paper.
    const released = [session];
    for (let guard = 0; guard < 20; guard++) {
      const blocking = await findFinishedSession(session.candidate.employeeId, session.assessmentType);
      if (!blocking) break;
      blocking.retakeAllowedAt = session.retakeAllowedAt;
      await updateSession(blocking);
      released.push(blocking);
    }

    // The release stands even when the e-mail cannot go: it is harmless on its
    // own, and HR can still send the link by hand. The message says which
    // happened, so nobody assumes a mail went out that did not.
    const to = session.candidate.email?.trim();
    const manual = `Copy the ${paper} link above and send it yourself.`;
    if (!to) {
      return NextResponse.json({
        ok: true, emailed: false,
        message: `${who} can sit the ${paper} paper again, but there is no e-mail address on file. ${manual}`,
      });
    }
    if (!smtpConfigured()) {
      return NextResponse.json({
        ok: true, emailed: false,
        message: `${who} can sit the ${paper} paper again, but e-mail is not configured for this app. ${manual}`,
      });
    }
    try {
      await sendRetakeEmail(to, {
        name: session.candidate.name,
        employeeId: session.candidate.employeeId,
        assessmentType: session.assessmentType,
        link,
      });
    } catch (err) {
      console.error("[admin retake e-mail]", err);
      return NextResponse.json({
        ok: true, emailed: false,
        message: `${who} can sit the ${paper} paper again, but the e-mail to ${to} could not be sent. ${manual}`,
      });
    }
    // Every row this released shows the link as sent.
    const sentAt = new Date().toISOString();
    for (const row of released) {
      row.retakeEmailedAt = sentAt;
      row.retakeEmailedTo = to;
      await updateSession(row);
    }
    return NextResponse.json({
      ok: true, emailed: true,
      message: `Retake released — the ${paper} link was e-mailed to ${who} at ${to}. This attempt is kept.`,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
