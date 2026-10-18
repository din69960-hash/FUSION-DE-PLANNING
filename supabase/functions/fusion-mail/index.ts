// Fonction d'envoi du mail automatique « nouvelle demande de manifestation »
// Appelée par le site après l'enregistrement d'une demande : { token, saison, id }.
// Le message est composé ici, à partir de la base : le site ne peut pas choisir le destinataire
// ni le contenu (pas de relais de mails ouvert).
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// Clé Resend : secret RESEND_API_KEY à définir dans Supabase (Edge Functions → Secrets). Jamais écrite dans le code.
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = Deno.env.get("RESEND_FROM") ?? "Planning Corbas <onboarding@resend.dev>";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erreur: "Méthode non autorisée" }, 405);
  let body: { token?: string; saison?: number; id?: string };
  try { body = await req.json(); } catch { return json({ erreur: "Requête invalide" }, 400); }
  const { token, saison, id } = body;
  if (!token || !saison || !id) return json({ erreur: "Paramètres manquants" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: prep, error } = await sb.rpc("fu_mail_preparer", { p_token: token, p_saison: Number(saison), p_id: String(id) });
  if (error) return json({ erreur: error.message }, 400);
  if (prep?.deja) return json({ envoye: false, deja: true });

  const r = prep.ligne || {};
  const asso = r.org || "une association";
  const espaces = Array.isArray(r.espaces) && r.espaces.length ? ` (${r.espaces.join(", ")})` : "";
  const date = String(r.date || "").replace("\n", " ");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a2b44;line-height:1.5">
    <p>Bonjour,</p>
    <p>Vous avez une demande de manifestation en cours de demande de la part de <b>${esc(asso)}</b>.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#5a6b85">Manifestation</td><td><b>${esc(r.manif)}</b></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#5a6b85">Date</td><td>${esc(date)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#5a6b85">Lieu</td><td>${esc(r.lieu)}${esc(espaces)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#5a6b85">Horaires</td><td>${esc(r.deb)} – ${esc(r.fin)}</td></tr>
      ${r.rem ? `<tr><td style="padding:4px 12px 4px 0;color:#5a6b85;vertical-align:top">Remarque</td><td style="white-space:pre-line">${esc(r.rem)}</td></tr>` : ""}
    </table>
    <p style="color:#5a6b85;font-size:12px">Saison ${esc(prep.saison)}–${esc(Number(prep.saison) + 1)} · ${esc(prep.mois)} · demande enregistrée le ${esc(r.ddate)}.<br>Message automatique du planning des équipements sportifs de Corbas.</p>
  </div>`;

  let statut = "erreur", detail = "";
  if (!RESEND_KEY) {
    detail = "Secret RESEND_API_KEY non défini dans Supabase : mail non envoyé.";
    await sb.rpc("fu_mail_resultat", { p_log: prep.log, p_statut: statut, p_detail: detail });
    return json({ envoye: false, detail }, 503);
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: FROM, to: [prep.dest], subject: `Nouvelle demande de manifestation — ${asso}`, html }),
    });
    const out = await res.json().catch(() => ({}));
    statut = res.ok ? "envoye" : "erreur";
    detail = JSON.stringify(out);
  } catch (e) { detail = String(e); }
  await sb.rpc("fu_mail_resultat", { p_log: prep.log, p_statut: statut, p_detail: detail });
  return json({ envoye: statut === "envoye", detail: statut === "envoye" ? undefined : detail }, statut === "envoye" ? 200 : 502);
});
