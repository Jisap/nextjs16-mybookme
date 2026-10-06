export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export type SendEmailResult =
  | { ok: true; skipped: false; id: string }
  | { ok: true; skipped: true; reason: "no-key" | "no-recipient" }
  | { ok: false; skipped: false; error: string };

/**
 * Envía email vía Resend (REST, sin SDK).
 * - Sin RESEND_API_KEY → modo dev: log y skipped (nunca rompe la reserva).
 * - Con key → POST https://api.resend.com/emails.
 * Nunca lanza: devuelve resultado para que el caller decida.
 */
export async function sendEmail(i: SendEmailInput): Promise<SendEmailResult> {
  if (!i.to.trim()) return { ok: true, skipped: true, reason: "no-recipient" };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[email:dev] to=${i.to} subject=${i.subject}`);
    return { ok: true, skipped: true, reason: "no-key" };
  }
  const from = process.env.EMAIL_FROM ?? "MyBookMe <no-reply@mybookme.app>";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: i.to, subject: i.subject, text: i.text, html: i.html }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      return { ok: false, skipped: false, error: `resend ${r.status}: ${body.slice(0, 200)}` };
    }
    const j = (await r.json().catch(() => ({}))) as { id?: string };
    return { ok: true, skipped: false, id: j.id ?? "unknown" };
  } catch (e) {
    return { ok: false, skipped: false, error: e instanceof Error ? e.message : String(e) };
  }
}
