// Envoi des mails : Brevo si le secret BREVO_API_KEY existe, sinon Resend (ancien réglage).
//   BREVO_API_KEY  clé API Brevo (xkeysib-…)
//   BREVO_FROM     adresse d'expéditeur vérifiée dans Brevo (défaut : din69960@hotmail.com)
const BREVO_KEY = Deno.env.get("BREVO_API_KEY") ?? "";
const BREVO_FROM = Deno.env.get("BREVO_FROM") ?? "din69960@hotmail.com";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Planning Corbas <onboarding@resend.dev>";

export const MAIL_PRET = !!(BREVO_KEY || RESEND_KEY);
export const MAIL_ABSENT = "Aucun service d'envoi configuré (secret BREVO_API_KEY absent dans Supabase) : mail non envoyé.";

export async function envoiMail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail: string }> {
  if (!MAIL_PRET) return { ok: false, detail: MAIL_ABSENT };
  try {
    const res = BREVO_KEY
      ? await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "Content-Type": "application/json", accept: "application/json", "api-key": BREVO_KEY },
          body: JSON.stringify({ sender: { name: "Planning Corbas", email: BREVO_FROM }, to: [{ email: to }], subject, htmlContent: html }),
        })
      : await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
        });
    const out = await res.json().catch(() => ({}));
    return { ok: res.ok, detail: JSON.stringify({ via: BREVO_KEY ? "brevo" : "resend", ...out }) };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}
