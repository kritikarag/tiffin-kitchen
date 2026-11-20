import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "./db";
import { fill, getDictionary, isLang } from "./i18n";
import { inLanguage } from "./menu";

// Where each order is after it's cooked: waiting, on the way, or delivered. The cook marks it, by voice or
// with a button, and can then tell the customer on WhatsApp in one tap, in the customer's own language.
// Sending WhatsApp messages from the server needs the WhatsApp Business API, so the message opens in her
// own WhatsApp, already written, and she taps Send.

export const DELIVERY = ["waiting", "preparing", "on_the_way", "delivered"] as const;
export type Delivery = (typeof DELIVERY)[number];
export const isDelivery = (v: unknown): v is Delivery => DELIVERY.includes(v as Delivery);

// Sets the status of some of today's placed orders for one kitchen. Only orders of that kitchen change.
export async function setDelivery(kitchenId: number, orderIds: number[], status: Delivery): Promise<number> {
  if (orderIds.length === 0) return 0;
  const [result] = await db().query<ResultSetHeader>(
    `UPDATE orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id
        SET o.delivery = ?
      WHERE dm.kitchen_id = ? AND o.id IN (?) AND o.status = 'placed'`,
    [status, kitchenId, orderIds],
  );
  return result.affectedRows;
}

// The WhatsApp message to the customer, in the language they ordered in, with the kitchen's name in it.
// The site's own address, for links that leave the app (WhatsApp messages).
export const SITE_URL = (process.env.SITE_URL ?? "https://tiffin.kitchen").replace(/\/$/, "");

export const trackUrl = (code: string) => `${SITE_URL}/track/${code}`;

export function customerMessage(
  order: { customer_name: string; phone: string; customer_language: string; track_code?: string | null },
  kitchen: { name: string; translations: unknown },
  status: Exclude<Delivery, "waiting">,
): string {
  const lang = isLang(order.customer_language) ? order.customer_language : "en";
  const t = getDictionary(lang);
  const names = (typeof kitchen.translations === "string" ? JSON.parse(kitchen.translations) : kitchen.translations) ?? {};
  const kitchenName = inLanguage<{ name?: string }>(names, lang)?.name || kitchen.name;
  const template = { preparing: t.msgPreparing, on_the_way: t.msgOnTheWay, delivered: t.msgDelivered }[status];
  let text = fill(template, { name: order.customer_name, kitchen: kitchenName });
  if (order.track_code && status !== "delivered") text += `\n${t.trackHere} ${trackUrl(order.track_code)}`;
  return `https://wa.me/91${order.phone}?text=${encodeURIComponent(text)}`;
}

export async function ordersForDelivery(kitchenId: number, orderIds: number[]): Promise<RowDataPacket[]> {
  if (orderIds.length === 0) return [];
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT o.id, o.customer_name, o.area FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id
      WHERE dm.kitchen_id = ? AND o.id IN (?) AND o.status = 'placed'`,
    [kitchenId, orderIds],
  );
  return rows;
}
