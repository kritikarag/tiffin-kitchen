import { handleOwnerTurn, type OwnerTurn } from "@/lib/agent";
import { callClaude } from "@/lib/model";

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
  } else if (typeof body.text === "string" && body.text.trim()) {
    turn = { type: "message", text: body.text };
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
