import type { RowDataPacket } from "mysql2";
import { db } from "./db";
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
  totals: { dish: string; quantity: number }[];
  orders: OwnerOrder[]; // placed orders first, then cancelled; each group in the order they came in
};

// The kitchen this owner conversation belongs to, or null before she has created one.
export async function kitchenForToken(token: string): Promise<{ id: number; name: string; timezone: string } | null> {
  const [rows] = await db().query<RowDataPacket[]>(
    "SELECT k.id, k.name, k.timezone FROM conversations c JOIN kitchens k ON k.id = c.kitchen_id WHERE c.token = ?",
    [token],
  );
  return rows[0] ? { id: rows[0].id, name: rows[0].name, timezone: rows[0].timezone } : null;
}

export async function ownerOrders(kitchen: { id: number; name: string; timezone: string }, date?: string): Promise<OwnerOrdersView> {
  const now = nowInZone(kitchen.timezone);
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : now.date;
  const view: OwnerOrdersView = {
    kitchenName: kitchen.name,
    date: day,
    menuState: "none",
    cutoffTime: null,
    orderCount: 0,
    portions: 0,
    revenue: 0,
    totals: [],
    orders: [],
  };

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

  const [totals] = await db().query<RowDataPacket[]>(
    `SELECT mi.name_original AS dish, SUM(oi.quantity) AS quantity
       FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.daily_menu_id = ? AND o.status = 'placed'
      GROUP BY mi.id, mi.name_original ORDER BY quantity DESC, mi.id`,
    [menu.id],
  );
  view.totals = totals.map((t) => ({ dish: t.dish, quantity: Number(t.quantity) }));
  view.portions = view.totals.reduce((sum, t) => sum + t.quantity, 0);

  // created_at is stored in UTC by the database session; the time shown is converted to her time zone.
  const [lines] = await db().query<RowDataPacket[]>(
    `SELECT o.id, UNIX_TIMESTAMP(o.created_at) AS placed_unix, o.customer_name, o.phone, o.area, o.note_original, o.status,
            mi.name_original AS dish, oi.quantity, oi.unit_price
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
        status: line.status,
        amount: 0,
        items: [],
      };
      byId.set(line.id, order);
    }
    order.items.push({ dish: line.dish, quantity: line.quantity });
    order.amount += line.quantity * line.unit_price;
  }
  const all = [...byId.values()];
  view.orders = [...all.filter((o) => o.status === "placed"), ...all.filter((o) => o.status === "cancelled")];
  view.orderCount = all.filter((o) => o.status === "placed").length;
  view.revenue = all.filter((o) => o.status === "placed").reduce((sum, o) => sum + o.amount, 0);
  return view;
}
