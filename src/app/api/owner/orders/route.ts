import { kitchenForToken, ownerOrders } from "@/lib/ownerOrders";
import { translateNotes } from "@/lib/transcript";
import { isLang } from "@/lib/i18n";

// GET /api/owner/orders?token=<conversation token>&date=YYYY-MM-DD (date optional, default today)
// &notes=0 leaves customer notes untranslated (used by the new-order alert).
// The token is the same one the owner page uses for the assistant.
// TODO(before launch): like /api/agent, this has no sign-in yet; anyone with the token can read the orders.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(token)) return Response.json({ error: "invalid" }, { status: 400 });
  try {
    const kitchen = await kitchenForToken(token);
    if (!kitchen) return Response.json({ kitchen: null });
    const asked = url.searchParams.get("lang");
    const lang = isLang(asked) ? asked : undefined;
    const view = await ownerOrders(kitchen, url.searchParams.get("date") ?? undefined, lang);
    // Customers write notes in their own language; show each one in the language the owner chose.
    const withNotes = view.orders.filter((o) => o.note);
    // notes=0 skips translation: the new-order alert polls often and only needs names and totals.
    if (url.searchParams.get("notes") !== "0" && lang && withNotes.length && process.env.ANTHROPIC_API_KEY) {
      const translated = await translateNotes(withNotes.map((o) => o.note!), lang);
      withNotes.forEach((o, i) => (o.noteTranslated = translated[i] !== o.note ? translated[i] : null));
    }
    return Response.json({ kitchen: view });
  } catch (error) {
    console.error("Owner orders failed", error);
    return Response.json({ error: "Could not load orders." }, { status: 500 });
  }
}
