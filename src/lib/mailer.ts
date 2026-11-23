/**
 * The retake e-mail.
 *
 * Releasing a re-take used to be three manual steps — press ↻ Retake, copy the
 * paper's link, write the candidate an e-mail — repeated for every person. The
 * console already knows the candidate's name, address and paper, so pressing
 * Retake now sends the link itself.
 *
 * Same SMTP settings as every other HR app on the platform: the shared .env
 * supplies SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM (the
 * standard noreply@rdc.in). The transport is built lazily, so importing this
 * module needs no configuration and buildRetakeEmail() is a pure function.
 */
import nodemailer, { type Transporter } from "nodemailer";
import type { AssessmentType } from "@/types";

export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;
function getTransport(): Transporter {
  if (transport) return transport;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
  return transport;
}

const PAPER: Record<AssessmentType, string> = {
  selling: "Selling Skill",
  technical: "Technical Skill",
};

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Subject, text and html for one candidate. No I/O. */
export function buildRetakeEmail(params: {
  name: string;
  employeeId: string;
  assessmentType: AssessmentType;
  link: string;
}): { subject: string; text: string; html: string } {
  const { name, employeeId, assessmentType, link } = params;
  const paper = PAPER[assessmentType];
  const subject = `RDC Techno-Commercial Assessment — ${paper}: your link to take it again`;

  const lines = [
    `Dear ${name || "Colleague"},`,
    "",
    `HR has released the ${paper} assessment for you to take again.`,
    "",
    `Open the assessment: ${link}`,
    "",
    `Sign in with your employee code${employeeId ? ` (${employeeId})` : ""} and your company e-mail address.`,
    "",
    "Before you start:",
    "• 15 questions, answered by voice, with 60 minutes on the clock.",
    "• Sit somewhere quiet and allow the browser to use your microphone.",
    "• Speak for about a minute on each question — say what you would actually do, and why.",
    "• If you are cut off, open the same link again: your answers are saved and the clock carries on from where it stopped.",
    "",
    "Regards,",
    "RDC HR",
  ];
  const text = lines.join("\n");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;line-height:1.5">
<p>Dear ${escapeHtml(name || "Colleague")},</p>
<p>HR has released the <strong>${escapeHtml(paper)}</strong> assessment for you to take again.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#e8541a;color:#ffffff;text-decoration:none;font-weight:bold;padding:10px 18px;border-radius:8px">Open the assessment</a></p>
<p style="color:#64748b;font-size:12px">or copy this address into your browser: ${escapeHtml(link)}</p>
<p>Sign in with your employee code${employeeId ? ` (<strong>${escapeHtml(employeeId)}</strong>)` : ""} and your company e-mail address.</p>
<p><strong>Before you start:</strong></p>
<ul>
<li>15 questions, answered by voice, with 60 minutes on the clock.</li>
<li>Sit somewhere quiet and allow the browser to use your microphone.</li>
<li>Speak for about a minute on each question — say what you would actually do, and why.</li>
<li>If you are cut off, open the same link again: your answers are saved and the clock carries on from where it stopped.</li>
</ul>
<p>Regards,<br>RDC HR</p>
</div>`;

  return { subject, text, html };
}

export async function sendRetakeEmail(
  to: string,
  params: Parameters<typeof buildRetakeEmail>[0]
): Promise<void> {
  const { subject, text, html } = buildRetakeEmail(params);
  await getTransport().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
