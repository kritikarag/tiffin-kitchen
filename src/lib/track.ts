import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import { isDelivery, type Delivery } from "./delivery";
import type { Lang } from "./i18n";
import { inLanguage } from "./menu";
import { nowInZone } from "./time";

// What a customer sees about their own orders. An order is reached only by the random code in its tracking
// link, which only the customer's phone (and anyone they share the link with) knows: there are no accounts.

export const isTrackCode = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{16}$/.test(v);

export type TrackedOrder = {
  code: string;
  id: number;
  kitchen: string;
  slug: string;
  ownerWhatsapp: string | null;
  date: string; // the menu day, YYYY-MM-DD
  status: "placed" | "cancelled";
  delivery: Delivery;
  receivedByCustomer: boolean;
  current: boolean; // today's or later, and not delivered or cancelled yet
  items: { dish: string; quantity: number }[];
  total: number;
  area: string;
  address: string | null;
};

const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) ?? {};

export async function trackOrders(codes: string[], lang: Lang): Promise<TrackedOrder[]> {
  const valid = [...new Set(codes.filter(isTrackCode))].slice(0, 50);
  if (valid.length === 0) return [];
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT o.id, o.track_code, o.area, o.address, o.status, o.delivery, o.delivered_by, dm.menu_date,
            k.name, k.slug, k.timezone, k.translations, k.owner_whatsapp,
            mi.name_original AS dish, mi.translations AS dish_tr, oi.quantity, oi.unit_price
       FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id JOIN kitchens k ON k.id = dm.kitchen_id
       JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.track_code IN (?) ORDER BY dm.menu_date DESC, o.id DESC, mi.id`,
    [valid],
  );
  const byCode = new Map<string, TrackedOrder>();
  for (const r of rows) {
    let order = byCode.get(r.track_code);
    if (!order) {
      const delivery = isDelivery(r.delivery) ? r.delivery : "waiting";
      order = {
        code: r.track_code,
        id: r.id,
        kitchen: inLanguage<{ name?: string }>(parse(r.translations), lang)?.name || r.name,
        slug: r.slug,
        ownerWhatsapp: r.owner_whatsapp ?? null,
        date: String(r.menu_date),
        status: r.status,
        delivery,
        receivedByCustomer: r.delivered_by === "customer",
        current: r.status === "placed" && delivery !== "delivered" && String(r.menu_date) >= nowInZone(r.timezone).date,
        items: [],
        total: 0,
        area: r.area,
        address: r.address ?? null,
      };
      byCode.set(r.track_code, order);
    }
    order.items.push({ dish: inLanguage<{ name?: string }>(parse(r.dish_tr), lang)?.name || r.dish, quantity: r.quantity });
    order.total += r.quantity * r.unit_price;
  }
  return [...byCode.values()];
}
