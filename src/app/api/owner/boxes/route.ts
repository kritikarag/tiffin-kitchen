import { db } from "@/lib/db";
import { kitchenForToken } from "@/lib/ownerOrders";

// POST /api/owner/boxes  { token, phone }  -> the owner tapped "Mark returned": that customer has no dabbas out.
// The same token check as the orders screen: it only changes boxes for this owner's kitchen.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; phone?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
  if (!/^[0-9a-f-]{36}$/.test(token) || !/^\d{10}$/.test(phone)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const kitchen = await kitchenForToken(token);
    if (!kitchen) return Response.json({ error: "not_found" }, { status: 404 });
    await db().query("UPDATE customer_boxes SET pending_boxes = 0 WHERE kitchen_id = ? AND customer_phone = ?", [kitchen.id, phone]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Marking boxes returned failed", error);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
