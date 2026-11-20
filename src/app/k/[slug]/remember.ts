// What this phone remembers for the customer, so a regular can order again in two taps.
// It lives only in this browser (localStorage): no account, and no personal details in any link.
// Every read and write is wrapped: private windows and blocked storage simply remember nothing.

export type Me = { name: string; phone: string; area: string; address?: string };
export type LastOrder = { items: Record<string, number> }; // menu item id -> quantity

const ME = "tiffin:me";
const ORDERS = "tiffin:orders"; // tracking codes of orders placed on this phone, newest first
const lastKey = (slug: string) => `tiffin:last:${slug}`;
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked: nothing is remembered, and the form still works.
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Raw strings, so React can compare snapshots cheaply.
export const readMe = () => read(ME);
export const readLast = (slug: string) => () => read(lastKey(slug));

export function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function remember(slug: string, me: Me, items: Record<string, number>) {
  write(ME, JSON.stringify(me));
  write(lastKey(slug), JSON.stringify({ items } satisfies LastOrder));
}

export const readOrders = () => read(ORDERS);

// Keeps an order's tracking code, so "My orders" can show it later. Opening a tracking link on this phone
// (say, from the cook's WhatsApp message) adds it too.
export function rememberOrder(code: string) {
  const codes = parse<string[]>(read(ORDERS)) ?? [];
  if (codes[0] === code) return;
  write(ORDERS, JSON.stringify([code, ...codes.filter((c) => c !== code)].slice(0, 50)));
}

// "Not you?" on a shared phone: forget the details and the list of orders.
export function forget() {
  write(ME, null);
  write(ORDERS, null);
}
