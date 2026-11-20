import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { checkMenuNotes } from "./noteCheck";
import { isDelivery, setDelivery } from "./delivery";
import { boxesByPhone } from "./ownerOrders";
import { db } from "./db";
import { checkDomain, isValidDomain, registerDomain } from "./godaddy";
import { LANGUAGES, isLang } from "./i18n";
import type { ModelCall, ToolDefinition } from "./model";
import { nowInZone } from "./time";
import { translateDishes, translateKitchen } from "./translate";

// A tool is three things: a description Claude reads, a flag saying whether the owner must confirm it,
// and a plain function that does the work. Claude never touches the database or GoDaddy; it can only
// ask for one of these functions to be run.

export type ToolContext = {
  kitchenId: number | null;
  model: ModelCall; // used only for translating new dishes
  dryRun?: boolean; // true: check the input and stop before changing anything
};

export type ToolOutcome = { ok: boolean; data: Record<string, unknown>; kitchenId?: number };

type Tool = {
  definition: ToolDefinition;
  needsConfirmation: boolean;
  run: (input: Record<string, unknown>, ctx: ToolContext) => Promise<ToolOutcome>;
};

// Thrown for problems Claude can fix by correcting its input or asking the owner.
class ToolError extends Error {}

// ---- input checks -------------------------------------------------------------------------------

function text(input: Record<string, unknown>, key: string, max: number): string {
  const value = input[key];
  if (typeof value !== "string" || !value.trim()) throw new ToolError(`"${key}" is required and must be text.`);
  return value.trim().slice(0, max);
}

function whole(input: Record<string, unknown>, key: string, min: number, max: number): number {
  const value = input[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new ToolError(`"${key}" must be a whole number from ${min} to ${max}.`);
  }
  return value;
}

function kitchenOf(ctx: ToolContext): number {
  if (ctx.kitchenId == null) throw new ToolError("There is no kitchen yet. Use create_kitchen first.");
  return ctx.kitchenId;
}

// "98450 98450", "+91 9845098450" -> "919845098450". Null when not given.
function whatsappNumber(value: unknown): string | null {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  if (!/^[6-9]\d{9}$/.test(digits)) throw new ToolError('"whatsapp" must be a 10-digit Indian mobile number.');
  return `91${digits}`;
}

// A UPI ID looks like name@bank. Null when not given.
function upiId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const id = String(value).trim().replace(/\s+/g, "").toLowerCase();
  if (!/^[a-z0-9._-]{2,99}@[a-z]{2,64}$/.test(id)) throw new ToolError('"upi_id" must look like name@bank, for example lakshmi@okaxis.');
  return id;
}

async function loadKitchen(id: number) {
  const [rows] = await db().query<RowDataPacket[]>("SELECT * FROM kitchens WHERE id = ?", [id]);
  if (!rows[0]) throw new ToolError("The kitchen no longer exists.");
  return rows[0];
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

const held = (summary: Record<string, unknown>): ToolOutcome => ({ ok: true, data: summary });

// ---- the tools ----------------------------------------------------------------------------------

const createKitchen: Tool = {
  needsConfirmation: true,
  definition: {
    name: "create_kitchen",
    description:
      "Save the new kitchen with its dishes and usual prices. Use once, after the owner has agreed to the menu and prices. The kitchen is saved as a draft; it is not public until publish_site.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Kitchen name as the owner wants customers to see it." },
        name_latin: { type: "string", description: "The same name in English letters, used for the web address. Example: Lakshmi Tiffins." },
        owner_language: { type: "string", enum: LANGUAGES.map((l) => l.code), description: "The language the owner speaks to you in." },
        delivery_area: { type: "string", description: "Areas she delivers to, comma separated." },
        capacity_per_day: { type: "integer", description: "Only if she says so herself: the most portions she can cook in a day. Leave out for no limit." },
        whatsapp: { type: "string", description: "Her WhatsApp number, 10 digits, if she gave one. Customers get a button to send her their order there." },
        upi_id: { type: "string", description: "Her UPI ID (like name@okaxis), if she gave one. Customers get a QR code to pay her directly." },
        dishes: {
          type: "array",
          description: "Her regular dishes.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Dish name as the owner said it." },
              price: { type: "integer", description: "Price in whole rupees." },
            },
            required: ["name", "price"],
          },
        },
      },
      required: ["name", "name_latin", "owner_language", "delivery_area", "dishes"],
    },
  },
  async run(input, ctx) {
    if (ctx.kitchenId != null) throw new ToolError("This owner already has a kitchen. Use update_menu to change dishes.");
    const name = text(input, "name", 160);
    const base = slugify(text(input, "name_latin", 80));
    if (!base) throw new ToolError('"name_latin" must contain English letters or digits.');
    if (!isLang(input.owner_language)) throw new ToolError(`"owner_language" must be one of: ${LANGUAGES.map((l) => l.code).join(", ")}.`);
    const area = text(input, "delivery_area", 255);
    // Optional: most home kitchens cook to order and have no fixed daily limit.
    const capacity = input.capacity_per_day == null ? null : whole(input, "capacity_per_day", 1, 2000);
    if (!Array.isArray(input.dishes) || input.dishes.length === 0 || input.dishes.length > 30) {
      throw new ToolError('"dishes" must list between 1 and 30 dishes.');
    }
    const dishes = input.dishes.map((d) => ({
      name: text(d as Record<string, unknown>, "name", 160),
      price: whole(d as Record<string, unknown>, "price", 1, 5000),
    }));
    const whatsapp = whatsappNumber(input.whatsapp);
    const upi = upiId(input.upi_id);
    if (ctx.dryRun) return held({ name, delivery_area: area, capacity_per_day: capacity, whatsapp, upi_id: upi, dishes });

    // Both translations run at the same time to keep her wait short.
    const [translations, kitchenText] = await Promise.all([
      translateDishes(ctx.model, dishes.map((d) => d.name)),
      translateKitchen(ctx.model, name, area),
    ]);

    const conn = await db().getConnection();
    try {
      await conn.beginTransaction();
      // Make the web address unique: lakshmi-tiffins, lakshmi-tiffins-2, ...
      let slug = base;
      for (let n = 2; ; n++) {
        const [taken] = await conn.query<RowDataPacket[]>("SELECT 1 FROM kitchens WHERE slug = ?", [slug]);
        if (taken.length === 0) break;
        slug = `${base}-${n}`;
      }
      const [kitchen] = await conn.query<ResultSetHeader>(
        "INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, owner_whatsapp, upi_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')",
        [slug, name, input.owner_language, area, JSON.stringify(kitchenText), capacity, whatsapp, upi],
      );
      const saved: { menu_item_id: number; name: string; price: number }[] = [];
      for (const [i, dish] of dishes.entries()) {
        const [item] = await conn.query<ResultSetHeader>(
          "INSERT INTO menu_items (kitchen_id, name_original, price, translations) VALUES (?, ?, ?, ?)",
          [kitchen.insertId, dish.name, dish.price, JSON.stringify(translations[i])],
        );
        saved.push({ menu_item_id: item.insertId, ...dish });
      }
      await conn.commit();
      return { ok: true, kitchenId: kitchen.insertId, data: { saved: true, status: "draft", page_path: `/k/${slug}`, dishes: saved } };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

const checkDomainTool: Tool = {
  needsConfirmation: false,
  definition: {
    name: "check_domain",
    description: "Check whether a domain name is free to register. Use it for every name before offering it to the owner.",
    input_schema: {
      type: "object",
      properties: { domain: { type: "string", description: "Full domain in lower case, such as lakshmitiffins.com." } },
      required: ["domain"],
    },
  },
  async run(input) {
    const domain = text(input, "domain", 253).toLowerCase();
    if (!isValidDomain(domain)) throw new ToolError(`"${domain}" is not a valid domain name. Use letters, digits and hyphens, then an ending such as .com or .in.`);
    return { ok: true, data: { ...(await checkDomain(domain)) } };
  },
};

const registerDomainTool: Tool = {
  needsConfirmation: true,
  definition: {
    name: "register_domain",
    description: "Register the domain the owner chose and attach it to her kitchen. Only for a domain that check_domain reported as available.",
    input_schema: {
      type: "object",
      properties: { domain: { type: "string", description: "The chosen domain, exactly as it was checked." } },
      required: ["domain"],
    },
  },
  async run(input, ctx) {
    const kitchenId = kitchenOf(ctx);
    const domain = text(input, "domain", 253).toLowerCase();
    if (!isValidDomain(domain)) throw new ToolError(`"${domain}" is not a valid domain name.`);
    const check = await checkDomain(domain); // checked again here: it may have been taken since she was asked
    if (!check.available) throw new ToolError(`${domain} is not available. Check another name.`);
    if (ctx.dryRun) return held({ domain, price: check.price, currency: check.currency });

    const result = await registerDomain(domain);
    await db().query("UPDATE kitchens SET domain = ? WHERE id = ?", [domain, kitchenId]);
    return { ok: true, data: { ...result } };
  },
};

const publishSite: Tool = {
  needsConfirmation: true,
  definition: {
    name: "publish_site",
    description: "Make the kitchen's ordering page public. Use after create_kitchen, when the owner is ready to launch.",
    input_schema: { type: "object", properties: {} },
  },
  async run(_input, ctx) {
    const kitchen = await loadKitchen(kitchenOf(ctx));
    if (ctx.dryRun) return held({ kitchen: kitchen.name, page_path: `/k/${kitchen.slug}` });
    await db().query("UPDATE kitchens SET status = 'live' WHERE id = ?", [kitchen.id]);
    return { ok: true, data: { status: "live", page_path: `/k/${kitchen.slug}`, domain: kitchen.domain } };
  },
};

const updateMenu: Tool = {
  needsConfirmation: true,
  definition: {
    name: "update_menu",
    description:
      "Set the menu for one day: which dishes, their prices and the order cut-off time. It replaces that day's menu. Set holiday to true to close the kitchen for that day instead.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "The day, as YYYY-MM-DD in the kitchen's local time." },
        holiday: { type: "boolean", description: "True if the kitchen is closed that day. Then cutoff_time and dishes are not needed." },
        cutoff_time: { type: "string", description: "Last time to order, 24-hour HH:MM. Example: 11:00." },
        dishes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              menu_item_id: { type: "integer", description: "Id of a saved dish. Leave out for a dish she has not sold before." },
              name: { type: "string", description: "Name of a new dish, as the owner said it. Only when menu_item_id is left out." },
              price: { type: "integer", description: "Price that day in whole rupees. Leave out to use the saved dish's usual price." },
            },
          },
        },
      },
      required: ["date"],
    },
  },
  async run(input, ctx) {
    const kitchen = await loadKitchen(kitchenOf(ctx));
    const date = text(input, "date", 10);
    const today = nowInZone(kitchen.timezone).date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new ToolError('"date" must be YYYY-MM-DD.');
    if (date < today) throw new ToolError(`"date" is in the past. Today is ${today}.`);

    if (input.holiday === true) {
      if (ctx.dryRun) return held({ date, holiday: true });
      await db().query(
        `INSERT INTO daily_menus (kitchen_id, menu_date, cutoff_time, status) VALUES (?, ?, NULL, 'holiday')
         ON DUPLICATE KEY UPDATE cutoff_time = NULL, status = 'holiday'`,
        [kitchen.id, date],
      );
      return { ok: true, data: { date, status: "holiday" } };
    }

    const cutoff = text(input, "cutoff_time", 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoff)) throw new ToolError('"cutoff_time" must be 24-hour HH:MM, such as 11:00.');
    if (!Array.isArray(input.dishes) || input.dishes.length === 0 || input.dishes.length > 30) {
      throw new ToolError('"dishes" must list between 1 and 30 dishes.');
    }

    const [savedRows] = await db().query<RowDataPacket[]>("SELECT id, name_original, price FROM menu_items WHERE kitchen_id = ?", [kitchen.id]);
    const saved = new Map(savedRows.map((r) => [r.id as number, r]));
    const existing: { id: number; name: string; price: number }[] = [];
    const fresh: { name: string; price: number }[] = [];
    for (const raw of input.dishes) {
      const dish = raw as Record<string, unknown>;
      if (dish.menu_item_id != null) {
        const row = saved.get(dish.menu_item_id as number);
        if (!row) throw new ToolError(`There is no saved dish with menu_item_id ${String(dish.menu_item_id)}.`);
        if (existing.some((e) => e.id === row.id)) throw new ToolError(`"${row.name_original}" is listed twice.`);
        existing.push({ id: row.id, name: row.name_original, price: dish.price == null ? row.price : whole(dish, "price", 1, 5000) });
      } else {
        fresh.push({ name: text(dish, "name", 160), price: whole(dish, "price", 1, 5000) });
      }
    }
    const summary = { date, cutoff_time: cutoff, dishes: [...existing, ...fresh].map((d) => ({ name: d.name, price: d.price })) };
    if (ctx.dryRun) return held(summary);

    const translations = await translateDishes(ctx.model, fresh.map((d) => d.name));

    const conn = await db().getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO daily_menus (kitchen_id, menu_date, cutoff_time, status) VALUES (?, ?, ?, 'open')
         ON DUPLICATE KEY UPDATE cutoff_time = VALUES(cutoff_time), status = 'open'`,
        [kitchen.id, date, `${cutoff}:00`],
      );
      const [menus] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM daily_menus WHERE kitchen_id = ? AND menu_date = ? FOR UPDATE",
        [kitchen.id, date],
      );
      const menuId = menus[0].id as number;
      const rows: [number, number, number][] = existing.map((d) => [menuId, d.id, d.price]);
      for (const [i, dish] of fresh.entries()) {
        const [item] = await conn.query<ResultSetHeader>(
          "INSERT INTO menu_items (kitchen_id, name_original, price, translations) VALUES (?, ?, ?, ?)",
          [kitchen.id, dish.name, dish.price, JSON.stringify(translations[i])],
        );
        rows.push([menuId, item.insertId, dish.price]);
      }
      await conn.query("DELETE FROM daily_menu_items WHERE daily_menu_id = ?", [menuId]);
      await conn.query("INSERT INTO daily_menu_items (daily_menu_id, menu_item_id, price) VALUES ?", [rows]);
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
    return { ok: true, data: { ...summary, status: "open", page_path: `/k/${kitchen.slug}`, page_is_public: kitchen.status === "live" } };
  },
};

const markSoldOut: Tool = {
  needsConfirmation: false,
  definition: {
    name: "mark_sold_out",
    description: "Mark one dish on today's menu as sold out, or put it back on sale. Takes effect on the page at once.",
    input_schema: {
      type: "object",
      properties: {
        menu_item_id: { type: "integer", description: "Id of the dish." },
        sold_out: { type: "boolean", description: "True to mark it sold out (the default). False to put it back on sale." },
      },
      required: ["menu_item_id"],
    },
  },
  async run(input, ctx) {
    const kitchen = await loadKitchen(kitchenOf(ctx));
    const itemId = whole(input, "menu_item_id", 1, 2 ** 31);
    const soldOut = input.sold_out !== false;
    const conn = await db().getConnection();
    try {
      await conn.beginTransaction();
      // Same lock the order API takes, so an order and this change cannot overlap.
      const [menus] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM daily_menus WHERE kitchen_id = ? AND menu_date = ? FOR UPDATE",
        [kitchen.id, nowInZone(kitchen.timezone).date],
      );
      const [changed] = menus[0]
        ? await conn.query<ResultSetHeader>(
            "UPDATE daily_menu_items SET sold_out = ? WHERE daily_menu_id = ? AND menu_item_id = ?",
            [soldOut, menus[0].id, itemId],
          )
        : [{ affectedRows: 0 }];
      await conn.commit();
      const [matched] = menus[0]
        ? await db().query<RowDataPacket[]>("SELECT 1 FROM daily_menu_items WHERE daily_menu_id = ? AND menu_item_id = ?", [menus[0].id, itemId])
        : [[]];
      if (matched.length === 0) throw new ToolError("That dish is not on today's menu.");
      return { ok: true, data: { menu_item_id: itemId, sold_out: soldOut, changed: changed.affectedRows > 0 } };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

// Delivery status: easy to change back, so it happens at once, like a dish selling out.
const markDelivery: Tool = {
  needsConfirmation: false,
  definition: {
    name: "mark_delivery",
    description:
      "Mark today's orders as on the way or delivered (or back to waiting). Choose the orders by order_ids (from get_orders), by area, or all of today's orders. After it, tell her she can tap \"Tell on WhatsApp\" in Today's orders to message each customer in their own language.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["on_the_way", "delivered", "waiting"] },
        order_ids: { type: "array", items: { type: "integer" }, description: "Order ids from get_orders." },
        area: { type: "string", description: "Every order in this delivery area." },
        all: { type: "boolean", description: "True for all of today's orders." },
      },
      required: ["status"],
    },
  },
  async run(input, ctx) {
    const kitchen = await loadKitchen(kitchenOf(ctx));
    if (!isDelivery(input.status)) throw new ToolError('"status" must be on_the_way, delivered or waiting.');
    const ids = Array.isArray(input.order_ids) ? input.order_ids.map(Number).filter((n) => Number.isInteger(n) && n > 0) : [];
    const area = typeof input.area === "string" ? input.area.trim() : "";
    if (ids.length === 0 && !area && input.all !== true) throw new ToolError("Say which orders: order_ids, an area, or all.");
    const [rows] = await db().query<RowDataPacket[]>(
      `SELECT o.id, o.customer_name, o.area FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id
        WHERE dm.kitchen_id = ? AND dm.menu_date = ? AND o.status = 'placed'`,
      [kitchen.id, nowInZone(kitchen.timezone).date],
    );
    const chosen = rows.filter((r) =>
      input.all === true || ids.includes(r.id) || (area && String(r.area).toLowerCase() === area.toLowerCase()),
    );
    if (chosen.length === 0) throw new ToolError("No order of today matches. Check get_orders for ids and areas.");
    const changed = await setDelivery(kitchen.id, chosen.map((r) => r.id), input.status);
    return { ok: true, data: { status: input.status, orders: chosen.length, changed, customers: chosen.map((r) => r.customer_name) } };
  },
};

const getOrders: Tool = {
  needsConfirmation: false,
  definition: {
    name: "get_orders",
    description:
      "Read one day's orders: the count, total portions, total per dish, and each order with its area, note, allergy_alert, delivery status (waiting, on_the_way, delivered) and the dabbas (boxes) that customer still has. Use it for any question about orders and for the cooking list. Never state order numbers from memory.",
    input_schema: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD. Leave out for today." } },
    },
  },
  async run(input, ctx) {
    const kitchen = await loadKitchen(kitchenOf(ctx));
    const date = typeof input.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : nowInZone(kitchen.timezone).date;
    const [menus] = await db().query<RowDataPacket[]>(
      "SELECT id, cutoff_time, status FROM daily_menus WHERE kitchen_id = ? AND menu_date = ?",
      [kitchen.id, date],
    );
    if (!menus[0]) return { ok: true, data: { date, menu: "none", order_count: 0, portions: 0, totals: [], orders: [] } };

    // New notes are checked for allergies first, so the cooking list can read those out first.
    await checkMenuNotes(ctx.model, menus[0].id);
    const boxes = kitchen.uses_dabbas ? await boxesByPhone(kitchen.id) : new Map<string, number>();

    // The numbers are added up by the database, not by Claude, so they are exact.
    const [totals] = await db().query<RowDataPacket[]>(
      `SELECT mi.name_original AS dish, SUM(oi.quantity) AS quantity
         FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.daily_menu_id = ? AND o.status = 'placed'
        GROUP BY mi.id, mi.name_original ORDER BY mi.id`,
      [menus[0].id],
    );
    const [lines] = await db().query<RowDataPacket[]>(
      `SELECT o.id, o.customer_name, o.phone, o.area, o.address, o.note_original, o.allergy_alert, o.status, o.delivery, mi.name_original AS dish, oi.quantity, oi.unit_price
         FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
        WHERE o.daily_menu_id = ? ORDER BY o.id, mi.id LIMIT 600`,
      [menus[0].id],
    );
    type Order = {
      order_id: number; customer_name: string; phone: string; area: string; address: string | null; note: string | null; allergy_alert: boolean; delivery: string;
      dabbas_with_customer: number; amount: number; items: { dish: string; quantity: number }[];
    };
    const placed = new Map<number, Order>();
    const cancelled = new Set<number>();
    for (const line of lines) {
      if (line.status !== "placed") {
        cancelled.add(line.id);
        continue;
      }
      const order: Order = placed.get(line.id) ?? {
        order_id: line.id, customer_name: line.customer_name, phone: line.phone, area: line.area, address: line.address ?? null, note: line.note_original,
        allergy_alert: Boolean(line.allergy_alert), delivery: line.delivery ?? "waiting", dabbas_with_customer: boxes.get(line.phone) ?? 0, amount: 0, items: [],
      };
      order.items.push({ dish: line.dish, quantity: line.quantity });
      order.amount += line.quantity * line.unit_price;
      placed.set(line.id, order);
    }
    const dishTotals = totals.map((t) => ({ dish: t.dish as string, quantity: Number(t.quantity) }));
    return {
      ok: true,
      data: {
        date,
        menu: menus[0].status,
        cutoff_time: menus[0].cutoff_time,
        order_count: placed.size,
        cancelled_count: cancelled.size,
        portions: dishTotals.reduce((sum, t) => sum + t.quantity, 0),
        totals: dishTotals,
        allergy_alerts: [...placed.values()].filter((o) => o.allergy_alert).length,
        delivered_count: [...placed.values()].filter((o) => o.delivery === "delivered").length,
        on_the_way_count: [...placed.values()].filter((o) => o.delivery === "on_the_way").length,
        dabbas_with_customers: [...boxes.values()].reduce((sum, n) => sum + n, 0),
        orders: [...placed.values()],
      },
    };
  },
};

const cancelOrder: Tool = {
  needsConfirmation: true,
  definition: {
    name: "cancel_order",
    description: "Cancel one customer's order. Find the order_id with get_orders first. If several orders could match what the owner said, ask her which one.",
    input_schema: {
      type: "object",
      properties: { order_id: { type: "integer", description: "The order's id from get_orders." } },
      required: ["order_id"],
    },
  },
  async run(input, ctx) {
    const kitchenId = kitchenOf(ctx);
    const orderId = whole(input, "order_id", 1, 2 ** 31);
    const [rows] = await db().query<RowDataPacket[]>(
      `SELECT o.id, o.customer_name, o.area, o.status
         FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id
        WHERE o.id = ? AND dm.kitchen_id = ?`, // the kitchen check stops one owner cancelling another's order
      [orderId, kitchenId],
    );
    const order = rows[0];
    if (!order) throw new ToolError(`There is no order ${orderId} for this kitchen.`);
    if (order.status === "cancelled") throw new ToolError(`Order ${orderId} is already cancelled.`);
    if (ctx.dryRun) return held({ order_id: orderId, customer_name: order.customer_name, area: order.area });
    await db().query("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId]);
    // The order's dabba never went out, so take it off the customer's count.
    await db().query(
      `UPDATE customer_boxes cb JOIN orders o ON o.phone = cb.customer_phone
          SET cb.pending_boxes = GREATEST(cb.pending_boxes, 1) - 1
        WHERE o.id = ? AND cb.kitchen_id = ?`,
      [orderId, kitchenId],
    );
    return { ok: true, data: { order_id: orderId, status: "cancelled", customer_name: order.customer_name } };
  },
};

// ---- dabbas: the boxes food goes out in ----
// One box goes out with each order (counted in orders.ts). She says who brought boxes back, or asks who
// still has them. No Yes needed, like sold out: it's quick, small and easy to correct.
const updateCustomerBoxes: Tool = {
  needsConfirmation: false,
  definition: {
    name: "update_customer_boxes",
    description:
      "Dabbas (tiffin boxes) still with customers. action \"check\": how many one customer has. action \"returned\": " +
      "a customer brought boxes back; give count, or leave it out if they returned all. action \"list\": everyone who " +
      "still has boxes, most first. Find the customer by name or phone. If several customers match, ask her which one.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["check", "returned", "list"] },
        customer: { type: "string", description: "The customer's name or phone number. Not needed for list." },
        count: { type: "integer", description: "How many boxes came back. Leave out when all came back." },
      },
      required: ["action"],
    },
  },
  async run(input, ctx) {
    const kitchenId = kitchenOf(ctx);
    const action = input.action;
    if (action !== "check" && action !== "returned" && action !== "list") throw new ToolError('"action" must be check, returned or list.');
    if (action === "list") {
      const [rows] = await db().query<RowDataPacket[]>(
        "SELECT customer_name, customer_phone, pending_boxes FROM customer_boxes WHERE kitchen_id = ? AND pending_boxes > 0 ORDER BY pending_boxes DESC, customer_name LIMIT 50",
        [kitchenId],
      );
      return {
        ok: true,
        data: {
          total_boxes: rows.reduce((sum, r) => sum + Number(r.pending_boxes), 0),
          customers: rows.map((r) => ({ customer_name: r.customer_name, phone: r.customer_phone, boxes: Number(r.pending_boxes) })),
        },
      };
    }

    const who = typeof input.customer === "string" ? input.customer.trim() : "";
    if (!who) throw new ToolError('"customer" is needed: a name or phone number.');
    const digits = who.replace(/\D/g, "");
    const [matches] = await db().query<RowDataPacket[]>(
      digits.length >= 6
        ? "SELECT customer_name, customer_phone, pending_boxes FROM customer_boxes WHERE kitchen_id = ? AND customer_phone LIKE ? LIMIT 10"
        : "SELECT customer_name, customer_phone, pending_boxes FROM customer_boxes WHERE kitchen_id = ? AND customer_name LIKE ? LIMIT 10",
      [kitchenId, digits.length >= 6 ? `%${digits.slice(-10)}` : `%${who}%`],
    );
    if (matches.length === 0) throw new ToolError(`No customer matching "${who}" has boxes on record. Ask her for the phone number, or use action list.`);
    if (matches.length > 1) {
      return {
        ok: false,
        data: {
          error: "Several customers match. Ask her which one.",
          matches: matches.map((m) => ({ customer_name: m.customer_name, phone: m.customer_phone, boxes: Number(m.pending_boxes) })),
        },
      };
    }
    const customer = matches[0];
    const before = Number(customer.pending_boxes);
    if (action === "check") return { ok: true, data: { customer_name: customer.customer_name, boxes: before } };

    const count = input.count == null ? before : whole(input, "count", 1, 100);
    const after = Math.max(0, before - count);
    await db().query("UPDATE customer_boxes SET pending_boxes = ? WHERE kitchen_id = ? AND customer_phone = ?", [after, kitchenId, customer.customer_phone]);
    return { ok: true, data: { customer_name: customer.customer_name, returned: before - after, boxes_left: after } };
  },
};

// ---- her payment and contact details, after launch ----
const updateKitchenDetails: Tool = {
  needsConfirmation: true,
  definition: {
    name: "update_kitchen_details",
    description:
      "Change her WhatsApp number or UPI ID after the kitchen is made, or turn dabba counting on or off. " +
      "Give only what she wants to change. Read the new value back to her before calling.",
    input_schema: {
      type: "object",
      properties: {
        whatsapp: { type: "string", description: "Her new WhatsApp number, 10 digits." },
        upi_id: { type: "string", description: "Her new UPI ID, like name@okaxis." },
        uses_dabbas: { type: "boolean", description: "true if food goes out in boxes that come back and she wants them counted." },
      },
    },
  },
  async run(input, ctx) {
    const kitchenId = kitchenOf(ctx);
    const changes: Record<string, string | boolean> = {};
    if (input.whatsapp != null && input.whatsapp !== "") changes.owner_whatsapp = whatsappNumber(input.whatsapp)!;
    if (input.upi_id != null && input.upi_id !== "") changes.upi_id = upiId(input.upi_id)!;
    if (typeof input.uses_dabbas === "boolean") changes.uses_dabbas = input.uses_dabbas;
    if (Object.keys(changes).length === 0) throw new ToolError("Give whatsapp, upi_id or uses_dabbas to change.");
    if (ctx.dryRun) return held(changes);
    const columns = Object.keys(changes); // fixed names from above, never from input
    await db().query(`UPDATE kitchens SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`, [...Object.values(changes), kitchenId]);
    return { ok: true, data: { updated: changes } };
  },
};

const TOOLS: Tool[] = [
  createKitchen, checkDomainTool, registerDomainTool, publishSite, updateMenu, markSoldOut, getOrders, cancelOrder, markDelivery,
  updateCustomerBoxes, updateKitchenDetails,
];
const byName = new Map(TOOLS.map((tool) => [tool.definition.name, tool]));

export const toolDefinitions: ToolDefinition[] = TOOLS.map((tool) => tool.definition);

export function needsConfirmation(name: string): boolean {
  return byName.get(name)?.needsConfirmation ?? false;
}

// Runs one tool. It never throws: a failure comes back as { ok: false }, which the agent hands to Claude
// as an error result so Claude can correct itself or tell the owner.
export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const tool = byName.get(name);
  if (!tool) return { ok: false, data: { error: `There is no tool named "${name}".` } };
  try {
    return await tool.run(typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {}, ctx);
  } catch (error) {
    if (error instanceof ToolError) return { ok: false, data: { error: error.message } };
    console.error(`Tool ${name} failed`, error);
    return { ok: false, data: { error: "The tool failed because of a technical problem. Tell the owner and offer to try again." } };
  }
}
