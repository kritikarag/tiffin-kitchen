// A ready-made demo: Lakshmi Tiffins, live, with today's menu and orders in three languages,
// plus an owner conversation already linked to the kitchen, and three more kitchens so the customer
// list at /k has choices. No API key is needed; all text is written here.
// Run with: npm run db:seed-demo     Optional: DEMO_CUTOFF=13:00 npm run db:seed-demo  (default 23:30)
// Running it again resets the demo kitchens and their orders.
import { randomUUID } from "node:crypto";
import { connect } from "./db.mjs";
import { readFileSync } from "node:fs";
import { dishes, kitchen, others } from "./demo-data.mjs";

// Adds the other languages (Tamil, Telugu, ...) made by `npm run labels`, keyed by the English name.
const extra = JSON.parse(readFileSync(new URL("./demo-translations.json", import.meta.url), "utf8"));
const withExtra = (translations) => ({ ...(extra[translations.en.name] ?? {}), ...translations });

const SLUG = "lakshmi-tiffins";
const TIMEZONE = "Asia/Kolkata";
const cutoff = `${process.env.DEMO_CUTOFF ?? "23:30"}:00`;
// A fixed token so the demo link stays the same every time the seed runs.
const OWNER_TOKEN = "11a6b5e1-d4e1-4000-8000-000000000001";

// Fictional customers. Notes are in the language each customer wrote in.
const orders = [
  { name: "Ravi", phone: "9876543210", area: "Indiranagar", lang: "en", note: "காரம் குறைவாக", items: { chapati: 2 } },
  { name: "Priya", phone: "9123456780", area: "Domlur", lang: "hi", note: "प्याज़ मत डालना", items: { chapati: 1, bbb: 2 } },
  { name: "ಅರುಣ್", phone: "9988776655", area: "Indiranagar", lang: "kn", note: null, items: { bbb: 1, payasa: 1 } },
  { name: "Meera", phone: "9811122233", area: "Domlur", lang: "en", note: "Please ring the bell twice", items: { bbb: 3, payasa: 3 } },
  { name: "Sanjay", phone: "9900011122", area: "Indiranagar", lang: "hi", note: null, items: { chapati: 2, payasa: 2 } },
  { name: "ಕಾವ್ಯ", phone: "9845098450", area: "Domlur", lang: "kn", note: "ಕಡಿಮೆ ಎಣ್ಣೆ", items: { chapati: 1 } },
  // A peanut allergy written in Hindi, for a cook who reads Kannada: the orders screen flags it in red.
  { name: "Farhan", phone: "9741234567", area: "Indiranagar", lang: "hi", note: "मूंगफली से एलर्जी है, बिल्कुल मत डालना", items: { bbb: 2 } },
];
const CANCELLED = "Sanjay"; // shows that cancelled orders drop out of the totals

const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());

const db = await connect();
// DEMO_OWNER_WHATSAPP=98XXXXXXXX gives Lakshmi a WhatsApp number, so the "Send on WhatsApp" button can be shown.
// Use your own number for the demo video. Without it the button is hidden.
function demoWhatsapp() {
  const digits = (process.env.DEMO_OWNER_WHATSAPP ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}
// DEMO_OWNER_UPI=yourname@bank shows the UPI QR code after an order. Use your own UPI ID: a made-up one
// could belong to a real person. Without it the QR code is hidden.
function demoUpi() {
  const upi = (process.env.DEMO_OWNER_UPI ?? "").trim();
  return /^[\w.-]{2,99}@[a-zA-Z]{2,64}$/.test(upi) ? upi : null;
}
// Boxes customers still had from earlier days, before today's orders.
const EARLIER_BOXES = { Ravi: 2, Meera: 1, Sanjay: 3 };

await db.beginTransaction();

await db.query("DELETE FROM conversations WHERE token = ?", [OWNER_TOKEN]);
await db.query("DELETE FROM kitchens WHERE slug = ?", [SLUG]); // cascades to menus, orders and conversations
const [k] = await db.query(
  `INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, timezone, domain, owner_whatsapp, upi_id, status)
   VALUES (?, ?, 'kn', ?, ?, NULL, ?, 'lakshmitiffins.in', ?, ?, 'live')`, // no daily limit
  [SLUG, kitchen.name, kitchen.area, JSON.stringify(withExtra(kitchen.translations)), TIMEZONE, demoWhatsapp(), demoUpi()],
);
const [menu] = await db.query(
  "INSERT INTO daily_menus (kitchen_id, menu_date, cutoff_time, status) VALUES (?, ?, ?, 'open')",
  [k.insertId, today, cutoff],
);

const ids = {};
const prices = {};
for (const dish of dishes) {
  const [item] = await db.query(
    "INSERT INTO menu_items (kitchen_id, name_original, price, translations) VALUES (?, ?, ?, ?)",
    [k.insertId, dish.name, dish.price, JSON.stringify(withExtra(dish.translations))],
  );
  ids[dish.key] = item.insertId;
  prices[dish.key] = dish.price;
  if (dish.today) {
    await db.query("INSERT INTO daily_menu_items (daily_menu_id, menu_item_id, price) VALUES (?, ?, ?)", [menu.insertId, item.insertId, dish.price]);
  }
}

for (const o of orders) {
  const [order] = await db.query(
    `INSERT INTO orders (daily_menu_id, customer_name, phone, area, note_original, customer_language, status, idempotency_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [menu.insertId, o.name, o.phone, o.area, o.note, o.lang, o.name === CANCELLED ? "cancelled" : "placed", `demo-${randomUUID()}`],
  );
  for (const [key, quantity] of Object.entries(o.items)) {
    await db.query("INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price) VALUES (?, ?, ?, ?)", [
      order.insertId,
      ids[key],
      quantity,
      prices[key],
    ]);
  }
  // One dabba goes out with each order that wasn't cancelled.
  const boxes = (EARLIER_BOXES[o.name] ?? 0) + (o.name === CANCELLED ? 0 : 1);
  if (boxes > 0) {
    await db.query(
      `INSERT INTO customer_boxes (kitchen_id, customer_phone, customer_name, pending_boxes) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pending_boxes = pending_boxes + VALUES(pending_boxes)`,
      [k.insertId, o.phone, o.name, boxes],
    );
  }
}

// ---- three more kitchens, for the customer list ----
for (const other of others) {
  await db.query("DELETE FROM kitchens WHERE slug = ?", [other.slug]);
  const translations = withExtra(Object.fromEntries(Object.entries(other.names).map(([lang, [name, area]]) => [lang, { name, delivery_area: area }])));
  const [ok] = await db.query(
    `INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, timezone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'live')`,
    [other.slug, other.names[other.owner][0], other.owner, other.names[other.owner][1], JSON.stringify(translations), null, TIMEZONE],
  );
  const [om] = await db.query("INSERT INTO daily_menus (kitchen_id, menu_date, cutoff_time, status) VALUES (?, ?, ?, ?)", [
    ok.insertId,
    today,
    other.status === "holiday" ? null : cutoff,
    other.status,
  ]);
  for (const [price, tr] of other.dishes) {
    const [item] = await db.query("INSERT INTO menu_items (kitchen_id, name_original, price, translations) VALUES (?, ?, ?, ?)", [
      ok.insertId,
      tr[other.owner].name,
      price,
      JSON.stringify(withExtra(tr)),
    ]);
    if (other.status !== "holiday") {
      await db.query("INSERT INTO daily_menu_items (daily_menu_id, menu_item_id, price) VALUES (?, ?, ?)", [om.insertId, item.insertId, price]);
    }
  }
}

// An empty owner conversation already linked to the kitchen, so /owner?t=<token> opens as Lakshmi.
await db.query("INSERT INTO conversations (token, kitchen_id, messages) VALUES (?, ?, '[]')", [OWNER_TOKEN, k.insertId]);

await db.commit();
await db.end();

const placed = orders.filter((o) => o.name !== CANCELLED);
const totals = {};
for (const o of placed) for (const [key, q] of Object.entries(o.items)) totals[key] = (totals[key] ?? 0) + q;
console.log(`Demo kitchen "${SLUG}" is live for ${today}, cut-off ${cutoff.slice(0, 5)}.`);
console.log(`Orders: ${placed.length} placed, 1 cancelled. Totals: ${dishes.filter((d) => totals[d.key]).map((d) => `${d.translations.en.name} ${totals[d.key]}`).join(", ")}.`);
console.log(`Also live: ${others.map((o) => o.slug).join(", ")} (Selvi Idli Mane is closed today).`);
console.log(`Kitchen list:  /k`);
console.log(`Customer page: /k/${SLUG}`);
console.log(`Owner page:    /owner?t=${OWNER_TOKEN}`);
