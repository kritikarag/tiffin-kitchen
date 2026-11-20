import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";

// GET /api/owner/kitchen?token=<conversation token> -> the kitchen this owner page belongs to, or null.
// Used to show her private kitchen link once she has a kitchen.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(token)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const [rows] = await db().query<RowDataPacket[]>(
      "SELECT k.name, k.slug, k.owner_whatsapp, k.status FROM conversations c JOIN kitchens k ON k.id = c.kitchen_id WHERE c.token = ?",
      [token],
    );
    const k = rows[0];
    return Response.json({ kitchen: k ? { name: k.name, slug: k.slug, whatsapp: k.owner_whatsapp, live: k.status === "live" } : null });
  } catch (error) {
    console.error("Owner kitchen lookup failed", error);
    return Response.json({ error: "Could not load." }, { status: 500 });
  }
}
