import { isLang } from "@/lib/i18n";
import { trackOrders } from "@/lib/track";

// POST /api/my-orders { codes, lang } -> the orders this phone has placed, newest first.
// The codes come from the phone's own storage; they are sent in the body, not the URL, so they stay out of logs.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { codes?: unknown; lang?: unknown } | null;
  const codes = Array.isArray(body?.codes) ? body.codes.filter((c): c is string => typeof c === "string") : [];
  try {
    const orders = await trackOrders(codes, isLang(body?.lang) ? body.lang : "en");
    return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("My orders failed", error);
    return Response.json({ error: "Could not load." }, { status: 500 });
  }
}
