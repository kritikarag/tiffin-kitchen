import type { RowDataPacket } from "mysql2";
import { db, parseJson } from "./db";
import { isPastCutoff, nowInZone } from "./time";

// Everything the owner's Orders screen shows for one day. Totals are added up by the database.

export type OwnerOrder = {
  id: number;
  placedAt: string; // "HH:MM" in the kitchen's time zone
  customerName: string;
  phone: string;
  area: string;
  note: string | null; // as the customer wrote it
  noteTranslated: string | null; // in the owner's chosen language, when it differs
  allergy: boolean; // the note is about an allergy or health (see noteCheck.ts); false also when unchecked
  boxesOut: number; // dabbas this customer still has, from all days
  status: "placed" | "cancelled";
  amount: number;
  items: { dish: string; quantity: number }[];
};

export type OwnerOrdersView = {
  kitchenName: string;
  date: string;
  menuState: "open" | "closed" | "holiday" | "none";
  cutoffTime: string | null;
  orderCount: number;
  portions: number;
  revenue: number;
  usesDabbas: boolean;
  boxesOut: number; // all dabbas still with customers
  totals: { dish: string; quantity: number }[];
  orders: OwnerOrder[]; // placed orders first, then cancelled; each group in the order they came in
};

// The kitchen this owner conversation belongs to, or null before she has created one.
type Kitchen = { id: number; name: string; timezone: string; translations: unknown; usesDabbas: boolean };
import type { Lang } from "./i18n";
import { inLanguage } from "./menu";
import type { ModelCall } from "./model";
import { checkMenuNotes } from "./noteCheck";

export async function kitchenForToken(token: string): Promise<Kitchen | null> {
  const [rows] = await db().query<RowDataPacket[]>(
    "SELECT k.id, k.name, k.timezone, k.translations, k.uses_dabbas FROM conversations c JOIN kitchens k ON k.id = c.kitchen_id WHERE c.token = ?",
    [token],
  );
  const k = rows[0];
  return k ? { id: k.id, name: k.name, timezone: k.timezone, translations: k.translations, usesDabbas: Boolean(k.uses_dabbas) } : null;
}

// A name in the chosen language, falling back to what the owner typed.
function named(original: string, translations: unknown, lang: Lang | undefined): string {
  if (!lang) return original;
  return inLanguage(parseJson<Partial<Record<Lang, { name?: string }>>>(translations, {}), lang)?.name || original;
}

// Dabbas still with each customer of this kitchen, by phone number.
export async function boxesByPhone(kitchenId: number): Promise<Map<string, number>> {
  const [rows] = await db().query<RowDataPacket[]>(
    "SELECT customer_phone, pending_boxes FROM customer_boxes WHERE kitchen_id = ? AND pending_boxes > 0",
    [kitchenId],
  );
  return new Map(rows.map((r) => [r.customer_phone as string, Number(r.pending_boxes)]));
}

// Dish and kitchen names are shown in the language she chose on the owner page (when a translation exists).
// With a model, notes not yet checked for allergies are checked first (see noteCheck.ts).
export async function ownerOrders(kitchen: Kitchen, date?: string, lang?: Lang, checkWith?: ModelCall): Promise<OwnerOrdersView> {
  const now = nowInZone(kitchen.timezone);
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : now.date;
  const view: OwnerOrdersView = {
    kitchenName: named(kitchen.name, kitchen.translations, lang),
    date: day,
    menuState: "none",
    cutoffTime: null,
    orderCount: 0,
    portions: 0,
    revenue: 0,
    usesDabbas: kitchen.usesDabbas,
    boxesOut: 0,
    totals: [],
    orders: [],
  };
  const boxes = kitchen.usesDabbas ? await boxesByPhone(kitchen.id) : new Map<string, number>();
  view.boxesOut = [...boxes.values()].reduce((sum, n) => sum + n, 0);

  const [menus] = await db().query<RowDataPacket[]>(
    "SELECT id, cutoff_time, status FROM daily_menus WHERE kitchen_id = ? AND menu_date = ?",
    [kitchen.id, day],
  );
  const menu = menus[0];
  if (!menu) return view;
  view.cutoffTime = menu.cutoff_time;
  view.menuState =
    menu.status === "holiday"
      ? "holiday"
      : menu.status === "closed" || (day === now.date && isPastCutoff(now.time, menu.cutoff_time)) || day < now.date
        ? "closed"
        : "open";

  if (checkWith) await checkMenuNotes(checkWith, menu.id);

  const [totals] = await db().query<RowDataPacket[]>(
    `SELECT mi.name_original AS dish, mi.translations, SUM(oi.quantity) AS quantity
       FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.daily_menu_id = ? AND o.status = 'placed'
      GROUP BY mi.id, mi.name_original, mi.translations ORDER BY quantity DESC, mi.id`,
    [menu.id],
  );
  view.totals = totals.map((t) => ({ dish: named(t.dish, t.translations, lang), quantity: Number(t.quantity) }));
  view.portions = view.totals.reduce((sum, t) => sum + t.quantity, 0);

  // created_at is stored in UTC by the database session; the time shown is converted to her time zone.
  const [lines] = await db().query<RowDataPacket[]>(
    `SELECT o.id, UNIX_TIMESTAMP(o.created_at) AS placed_unix, o.customer_name, o.phone, o.area, o.note_original, o.allergy_alert, o.status,
            mi.name_original AS dish, mi.translations, oi.quantity, oi.unit_price
       FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.daily_menu_id = ? ORDER BY o.id, mi.id LIMIT 2000`,
    [menu.id],
  );
  const byId = new Map<number, OwnerOrder>();
  for (const line of lines) {
    let order = byId.get(line.id);
    if (!order) {
      order = {
        id: line.id,
        placedAt: nowInZone(kitchen.timezone, new Date(Number(line.placed_unix) * 1000)).time.slice(0, 5),
        customerName: line.customer_name,
        phone: line.phone,
        area: line.area,
        note: line.note_original,
        noteTranslated: null,
        allergy: Boolean(line.allergy_alert),
        boxesOut: boxes.get(line.phone) ?? 0,
        status: line.status,
        amount: 0,
        items: [],
      };
      byId.set(line.id, order);
    }
    order.items.push({ dish: named(line.dish, line.translations, lang), quantity: line.quantity });
    order.amount += line.quantity * line.unit_price;
  }
  const all = [...byId.values()];
  view.orders = [...all.filter((o) => o.status === "placed"), ...all.filter((o) => o.status === "cancelled")];
  view.orderCount = all.filter((o) => o.status === "placed").length;
  view.revenue = all.filter((o) => o.status === "placed").reduce((sum, o) => sum + o.amount, 0);
  return view;
}
