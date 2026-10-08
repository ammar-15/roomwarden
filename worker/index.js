// Room Warden Worker: serves the static site from /public and handles the demo form.
// POST /api/contact -> saves the request to D1 (table: leads), then emails it to CONTACT_TO
// through Cloudflare Email Service. Any email error is stored on the row in email_error.

const LIMITS = { name: 120, email: 200, hotel: 160, rooms: 40, phone: 40, message: 4000 };
const ROOM_OPTIONS = ["", "Under 50", "50 to 100", "100 to 200", "200+"];

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const clean = (v, max) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n]+/g, " ");
const isEmail = (v) => /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/.test(v);

async function handleContact(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST." }, 405);

  // Only accept submissions from this site.
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ error: "Requests from other sites aren't accepted." }, 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "The form data couldn't be read. Refresh the page and try again." }, 400);
  }

  // Spam trap: real people never see or fill this field.
  if (clean(form.get("website"), 200)) return json({ ok: true });

  const data = {};
  for (const [key, max] of Object.entries(LIMITS)) data[key] = clean(form.get(key), max);
  for (const key of ["name", "email", "hotel", "rooms", "phone"]) data[key] = oneLine(data[key]);

  if (!data.name || !data.email || !data.hotel) {
    return json({ error: "Add your name, work email and hotel name, then send it again." }, 400);
  }
  if (!isEmail(data.email)) return json({ error: "That email address doesn't look right. Check it and try again." }, 400);
  if (!ROOM_OPTIONS.includes(data.rooms)) data.rooms = "";

  const text = [
    "New demo request from roomwarden.com",
    "",
    `Name:    ${data.name}`,
    `Email:   ${data.email}`,
    `Hotel:   ${data.hotel}`,
    `Rooms:   ${data.rooms || "Not given"}`,
    `Phone:   ${data.phone || "Not given"}`,
    "",
    "What they want to fix first:",
    data.message || "Not given",
    "",
    `Sent ${new Date().toUTCString()}`,
  ].join("\n");

  // 1. Save the request first, so it's never lost even if email has a problem.
  let leadId = null;
  try {
    const row = await env.DB.prepare(
      "INSERT INTO leads (name, email, hotel, rooms, phone, message) VALUES (?, ?, ?, ?, ?, ?) RETURNING id"
    ).bind(data.name, data.email, data.hotel, data.rooms, data.phone, data.message).first();
    leadId = row && row.id;
  } catch (err) {
    console.error("Saving lead failed", err && err.message);
  }

  // 2. Email it.
  let emailError = null;
  try {
    await env.EMAIL.send({
      from: { email: env.CONTACT_FROM, name: "Room Warden website" },
      to: env.CONTACT_TO,
      replyTo: data.email,
      subject: `Demo request: ${data.hotel}`,
      text,
    });
  } catch (err) {
    emailError = `${(err && err.code) || "error"}: ${(err && err.message) || String(err)}`.slice(0, 500);
    console.error("Email send failed", emailError);
  }

  if (leadId) {
    try {
      await env.DB.prepare("UPDATE leads SET emailed = ?, email_error = ? WHERE id = ?")
        .bind(emailError ? 0 : 1, emailError, leadId).run();
    } catch (err) {
      console.error("Updating lead failed", err && err.message);
    }
  }

  // The visitor only sees an error if we couldn't keep their request at all.
  if (!leadId && emailError) {
    return json({ error: "That didn't go through on our end. Try again in a minute." }, 502);
  }
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") return handleContact(request, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
