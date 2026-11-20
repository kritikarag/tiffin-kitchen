import { confirmReceived } from "@/lib/delivery";
import { isTrackCode } from "@/lib/track";

// POST /api/track/received { code } -> the customer says the tiffin reached them.
// The tracking code is the key, as for viewing the order; it only ever moves an order to delivered.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  if (!isTrackCode(body?.code)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    await confirmReceived(body.code);
    return Response.json({ ok: true }); // already delivered counts as done
  } catch (error) {
    console.error("Confirm received failed", error);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
