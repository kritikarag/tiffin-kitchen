import { cleanTranscript } from "@/lib/transcript";

// POST /api/transcript  { text, token? } -> { text }
// Fixes misheard dish names in dictated text. On any failure it returns the original text,
// so voice input never gets worse because of this step.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
  if (!text) return Response.json({ error: "invalid" }, { status: 400 });
  const token = typeof body.token === "string" && /^[0-9a-f-]{36}$/.test(body.token) ? body.token : null;

  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ text, cleaned: false });
  try {
    const cleaned = await cleanTranscript(text, token);
    return Response.json({ text: cleaned, cleaned: cleaned !== text });
  } catch (error) {
    console.error("Transcript clean-up failed", error);
    return Response.json({ text, cleaned: false });
  }
}
