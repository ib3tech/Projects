import { buildBody, buildSubject } from "@/lib/email";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { emailFrom, validateAnswers } from "@/lib/validate";

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const MAX_BODY_CHARS = 64 * 1024;

type Reply = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const reply = (body: Reply, status: number) => Response.json(body, { status });

export async function POST(request: Request) {
  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    console.error("WEB3FORMS_ACCESS_KEY is not set");
    return reply({ ok: false, error: "The form is not set up to send yet." }, 500);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) {
    return reply({ ok: false, error: "That submission is too large." }, 413);
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Handled below.
  }
  if (!parsed || typeof parsed !== "object") {
    return reply({ ok: false, error: "The submission could not be read." }, 400);
  }
  const payload = parsed as { answers?: unknown; [HONEYPOT_FIELD]?: unknown };

  // Bots fill every field. Pretend it worked so they move on.
  if (typeof payload[HONEYPOT_FIELD] === "string" && payload[HONEYPOT_FIELD] !== "") {
    return reply({ ok: true }, 200);
  }

  const result = validateAnswers(payload.answers);
  if (!result.ok) {
    return reply(
      { ok: false, error: "Some answers need another look.", fieldErrors: result.errors },
      422,
    );
  }

  const { answers } = result;
  const replyTo = emailFrom(answers.contact);

  let res: Response;
  try {
    res = await fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: accessKey,
        subject: buildSubject(answers),
        from_name: "HomeLink feedback form",
        ...(replyTo ? { replyto: replyTo } : {}),
        message: buildBody(answers),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("Web3Forms request failed", err);
    return reply({ ok: false, error: "We could not reach the email service." }, 502);
  }

  const raw = await res.text();
  let data: { success?: boolean; message?: string } = {};
  try {
    data = JSON.parse(raw);
  } catch {
    // A non-JSON reply is usually a bot-protection page in front of the API.
  }

  if (!res.ok || data.success !== true) {
    console.error("Web3Forms rejected the submission", res.status, data.message ?? raw.slice(0, 300));
    return reply({ ok: false, error: "The email service did not accept the message." }, 502);
  }

  return reply({ ok: true }, 200);
}
