import { kitchenForToken, ownerOrders } from "@/lib/ownerOrders";
import { translateNotes } from "@/lib/transcript";

// GET /api/owner/orders?token=<conversation token>&date=YYYY-MM-DD (date optional, default today)
// The token is the same one the owner page uses for the assistant.
// TODO(before launch): like /api/agent, this has no sign-in yet; anyone with the token can read the orders.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(token)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const kitchen = await kitchenForToken(token);
    if (!kitchen) return Response.json({ kitchen: null });
    const view = await ownerOrders(kitchen, url.searchParams.get("date") ?? undefined);
    // Customers write notes in their own language; show each one in the language the owner chose.
    const lang = url.searchParams.get("lang");
    const withNotes = view.orders.filter((o) => o.note);
    if ((lang === "kn" || lang === "hi" || lang === "en") && withNotes.length && process.env.ANTHROPIC_API_KEY) {
      const translated = await translateNotes(withNotes.map((o) => o.note!), lang);
      withNotes.forEach((o, i) => (o.noteTranslated = translated[i] !== o.note ? translated[i] : null));
    }
    return Response.json({ kitchen: view });
  } catch (error) {
    console.error("Owner orders failed", error);
    return Response.json({ error: "Could not load orders." }, { status: 500 });
  }
}
