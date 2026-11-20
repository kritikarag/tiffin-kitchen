import { confirmReceived, reportNotReceived } from "@/lib/delivery";
import { isTrackCode } from "@/lib/track";

// POST /api/track/received { code, arrived } -> the customer says whether the tiffin reached them.
// arrived true marks it delivered; false tells the cook it didn't come. The tracking code is the key,
// as for viewing the order.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown; arrived?: unknown } | null;
  if (!isTrackCode(body?.code)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    if (body.arrived === false) await reportNotReceived(body.code);
    else await confirmReceived(body.code);
    return Response.json({ ok: true }); // already answered counts as done
  } catch (error) {
    console.error("Confirm received failed", error);
    return Response.json({ error: "Could not save." }, { status: 500 });
  }
}
