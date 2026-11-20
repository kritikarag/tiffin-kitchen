import { isOwnerStage, setDelivery } from "@/lib/delivery";
import { kitchenForToken } from "@/lib/ownerOrders";

// POST /api/owner/delivery { token, orderId, status } -> the cook tapped On the way or Delivered on an order.
// The same token check as the orders screen: only this owner's kitchen's orders change.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; orderId?: unknown; status?: unknown } | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const orderId = Number(body?.orderId);
  if (!/^[0-9a-f-]{36}$/.test(token) || !Number.isInteger(orderId) || !isOwnerStage(body?.status)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const kitchen = await kitchenForToken(token);
    if (!kitchen) return Response.json({ error: "not_found" }, { status: 404 });
    const changed = await setDelivery(kitchen.id, [orderId], body.status);
    return changed ? Response.json({ ok: true }) : Response.json({ error: "not_found" }, { status: 404 });
  } catch (error) {
    console.error("Delivery update failed", error);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
