import { handleOwnerTurn, type OwnerTurn } from "@/lib/agent";
import { callClaude, type ImageBlock } from "@/lib/model";

// POST /api/agent
// Body: { token?: string, type: "message", text: string } or { token, type: "confirm" | "cancel" }
// The token comes back in every reply; the dashboard sends it with the next turn to continue the conversation.
//
// TODO(before launch): this route has no sign-in yet. Anyone holding a token can act on that kitchen.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const token = typeof body.token === "string" && /^[0-9a-f-]{36}$/.test(body.token) ? body.token : null;
  let turn: OwnerTurn;
  if (body.type === "confirm" || body.type === "cancel") {
    if (!token) return Response.json({ error: "invalid" }, { status: 400 });
    turn = { type: body.type };
  } else if (body.image != null || (typeof body.text === "string" && body.text.trim())) {
    const image = readImage(body.image);
    if (body.image != null && !image) return Response.json({ error: "That photo could not be read. Please use a JPEG or PNG photo." }, { status: 400 });
    turn = { type: "message", text: typeof body.text === "string" ? body.text : "", ...(image ? { image } : {}) };
  } else {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 503 });
  }

  try {
    return Response.json(await handleOwnerTurn(token, turn, callClaude));
  } catch (error) {
    console.error("Agent turn failed", error);
    return Response.json({ error: "The assistant is not reachable right now. Please try again." }, { status: 502 });
  }
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
const MAX_IMAGE_BASE64 = 6_000_000; // about 4.5 MB; the page shrinks photos well below this

// Checks a photo sent as { media_type, data } with base64 data.
function readImage(value: unknown): ImageBlock["source"] | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const type = IMAGE_TYPES.find((t) => t === v.media_type);
  if (!type || typeof v.data !== "string" || v.data.length === 0 || v.data.length > MAX_IMAGE_BASE64) return null;
  if (!/^[A-Za-z0-9+/]+=*$/.test(v.data)) return null;
  return { type: "base64", media_type: type, data: v.data };
}
