import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "./db";
import { DEFAULT_LANG, isLang, type Lang } from "./i18n";
import { isPastCutoff, nowInZone } from "./time";

export type OrderErrorCode = "invalid" | "empty" | "not_found" | "closed" | "sold_out" | "capacity";

export type OrderResult =
  | { ok: true; orderId: number; total: number }
  | { ok: false; error: OrderErrorCode };

type OrderInput = {
  slug: string;
  idempotencyKey: string;
  customerName: string;
  phone: string;
  area: string;
  note: string | null;
  language: Lang;
  items: { menuItemId: number; quantity: number }[];
};

const MAX_QUANTITY_PER_DISH = 20;

// Turns the untrusted request body into a clean OrderInput, or says why it can't.
export function parseOrder(body: unknown): { input: OrderInput } | { error: OrderErrorCode } {
  if (typeof body !== "object" || body === null) return { error: "invalid" };
  const b = body as Record<string, unknown>;
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

  const slug = text(b.slug, 80);
  const idempotencyKey = text(b.idempotencyKey, 64);
  const customerName = text(b.customerName, 120);
  const area = text(b.area, 160);
  const note = text(b.note, 500) || null;

  // Accept "+91 98765 43210", "098765 43210" and so on; keep the 10-digit Indian mobile number.
  const digits = text(b.phone, 20).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const phoneOk = /^[6-9]\d{9}$/.test(digits);

  if (!slug || idempotencyKey.length < 8 || !customerName || !area || !phoneOk) return { error: "invalid" };

  // Merge repeated dishes and drop zero quantities.
  const quantities = new Map<number, number>();
  for (const raw of Array.isArray(b.items) ? b.items : []) {
    const id = Number((raw as Record<string, unknown>)?.menuItemId);
    const quantity = Number((raw as Record<string, unknown>)?.quantity);
    if (!Number.isInteger(id) || !Number.isInteger(quantity) || quantity < 0) return { error: "invalid" };
    if (quantity > 0) quantities.set(id, (quantities.get(id) ?? 0) + quantity);
  }
  if (quantities.size === 0) return { error: "empty" };
  if ([...quantities.values()].some((q) => q > MAX_QUANTITY_PER_DISH)) return { error: "invalid" };

  return {
    input: {
      slug,
      idempotencyKey,
      customerName,
      phone: digits,
      area,
      note,
      language: isLang(b.language) ? b.language : DEFAULT_LANG,
      items: [...quantities].map(([menuItemId, quantity]) => ({ menuItemId, quantity })),
    },
  };
}

// Checks and writes happen in one transaction. The day's menu row is locked first, so two orders for the
// same kitchen and day run one after the other and the capacity and sold-out checks cannot race.
export async function placeOrder(input: OrderInput): Promise<OrderResult> {
  const conn = await db().getConnection();
  try {
    // Read the kitchen before the transaction starts. Inside it, the first statement must be the
    // locking read below: InnoDB takes its snapshot at the first plain SELECT, and that has to happen
    // after the lock is held, or this request would not see an order committed while it was waiting.
    const [kitchens] = await conn.query<RowDataPacket[]>(
      "SELECT id, timezone, capacity_per_day FROM kitchens WHERE slug = ? AND status = 'live'",
      [input.slug],
    );
    const kitchen = kitchens[0];
    if (!kitchen) return { ok: false, error: "not_found" };

    await conn.beginTransaction();
    const fail = async (error: OrderErrorCode): Promise<OrderResult> => {
      await conn.rollback();
      return { ok: false, error };
    };

    const now = nowInZone(kitchen.timezone);
    const [menus] = await conn.query<RowDataPacket[]>(
      "SELECT id, cutoff_time, status FROM daily_menus WHERE kitchen_id = ? AND menu_date = ? FOR UPDATE",
      [kitchen.id, now.date],
    );
    const menu = menus[0];
    if (!menu) return fail("closed");

    // A repeated submit (double tap, retry) returns the order that already exists.
    const [existing] = await conn.query<RowDataPacket[]>(
      `SELECT o.id, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total
         FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE o.daily_menu_id = ? AND o.idempotency_key = ?
        GROUP BY o.id`,
      [menu.id, input.idempotencyKey],
    );
    if (existing[0]) {
      await conn.commit();
      return { ok: true, orderId: existing[0].id, total: Number(existing[0].total) };
    }

    if (menu.status !== "open" || isPastCutoff(now.time, menu.cutoff_time)) return fail("closed");

    const [dishes] = await conn.query<RowDataPacket[]>(
      "SELECT menu_item_id, price, sold_out FROM daily_menu_items WHERE daily_menu_id = ?",
      [menu.id],
    );
    const onMenu = new Map(dishes.map((d) => [d.menu_item_id as number, d]));
    let total = 0;
    let portions = 0;
    for (const item of input.items) {
      const dish = onMenu.get(item.menuItemId);
      if (!dish) return fail("invalid"); // not on today's menu
      if (dish.sold_out) return fail("sold_out");
      total += dish.price * item.quantity;
      portions += item.quantity;
    }

    if (kitchen.capacity_per_day != null) {
      const [booked] = await conn.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(oi.quantity), 0) AS portions
           FROM orders o JOIN order_items oi ON oi.order_id = o.id
          WHERE o.daily_menu_id = ? AND o.status = 'placed'`,
        [menu.id],
      );
      if (Number(booked[0].portions) + portions > kitchen.capacity_per_day) return fail("capacity");
    }

    const [order] = await conn.query<ResultSetHeader>(
      `INSERT INTO orders (daily_menu_id, customer_name, phone, area, note_original, customer_language, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [menu.id, input.customerName, input.phone, input.area, input.note, input.language, input.idempotencyKey],
    );
    await conn.query("INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES ?", [
      input.items.map((i) => [order.insertId, i.menuItemId, i.quantity, onMenu.get(i.menuItemId)!.price]),
    ]);

    await conn.commit();
    return { ok: true, orderId: order.insertId, total };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
