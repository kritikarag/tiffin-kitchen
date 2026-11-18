// A ready-made demo: Lakshmi Tiffins, live, with today's menu and orders in three languages,
// plus an owner conversation already linked to the kitchen. No API key is needed; all text is written here.
// Run with: npm run db:seed-demo     Optional: DEMO_CUTOFF=13:00 npm run db:seed-demo  (default 23:30)
// Running it again resets the demo kitchen and its orders.
import { randomUUID } from "node:crypto";
import { connect } from "./db.mjs";

const SLUG = "lakshmi-tiffins";
const TIMEZONE = "Asia/Kolkata";
const cutoff = `${process.env.DEMO_CUTOFF ?? "23:30"}:00`;
// A fixed token so the demo link stays the same every time the seed runs.
const OWNER_TOKEN = "11a6b5e1-d4e1-4000-8000-000000000001";

const kitchen = {
  name: "ಲಕ್ಷ್ಮಿ ಟಿಫಿನ್ಸ್",
  area: "ಇಂದಿರಾನಗರ, ದೊಮ್ಮಲೂರು",
  translations: {
    kn: { name: "ಲಕ್ಷ್ಮಿ ಟಿಫಿನ್ಸ್", delivery_area: "ಇಂದಿರಾನಗರ, ದೊಮ್ಮಲೂರು" },
    hi: { name: "लक्ष्मी टिफ़िन्स", delivery_area: "इंदिरानगर, दोम्मलूरु" },
    en: { name: "Lakshmi Tiffins", delivery_area: "Indiranagar, Domlur" },
  },
};

// key is only used in this script to refer to dishes below.
const dishes = [
  {
    key: "chapati",
    name: "ಚಪಾತಿ ಪಲ್ಯ",
    price: 70,
    today: true,
    translations: {
      kn: { name: "ಚಪಾತಿ ಪಲ್ಯ", description: "ಮೃದುವಾದ ಚಪಾತಿ ಮತ್ತು ತರಕಾರಿ ಪಲ್ಯ" },
      hi: { name: "चपाती पल्य", description: "नरम चपाती के साथ सूखी मसालेदार सब्ज़ी" },
      en: { name: "Chapati Palya", description: "Soft chapati with a dry spiced vegetable stir-fry" },
    },
  },
  {
    key: "sambar",
    name: "ಅನ್ನ ಸಾಂಬಾರ್",
    price: 70,
    today: false, // a saved dish that is not on today's menu
    translations: {
      kn: { name: "ಅನ್ನ ಸಾಂಬಾರ್", description: "ಅನ್ನ, ಸಾಂಬಾರ್ ಮತ್ತು ಮೊಸರು" },
      hi: { name: "अन्न सांबार", description: "चावल के साथ दाल और सब्ज़ियों का सांबर" },
      en: { name: "Anna Sambar", description: "Steamed rice with lentil and vegetable sambar" },
    },
  },
  {
    key: "bbb",
    name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್",
    price: 80,
    today: true,
    translations: {
      kn: { name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", description: "ಬೂಂದಿ ಜೊತೆ ಬಿಸಿ ಬೇಳೆ ಬಾತ್" },
      hi: { name: "बिसि बेले बाथ", description: "दाल, चावल और सब्ज़ियों से बना कर्नाटक का व्यंजन" },
      en: { name: "Bisi Bele Bath", description: "Karnataka's spiced rice and lentils, with boondi" },
    },
  },
  {
    key: "payasa",
    name: "ಶಾವಿಗೆ ಪಾಯಸ",
    price: 40,
    today: true,
    translations: {
      kn: { name: "ಶಾವಿಗೆ ಪಾಯಸ", description: "ಹಾಲು ಮತ್ತು ಬೆಲ್ಲದ ಶಾವಿಗೆ ಪಾಯಸ" },
      hi: { name: "शाविगे पायसा", description: "दूध और गुड़ से बनी सेवइयों की खीर" },
      en: { name: "Shavige Payasa", description: "Vermicelli pudding with milk and jaggery" },
    },
  },
];

// Fictional customers. Notes are in the language each customer wrote in.
const orders = [
  { name: "Ravi", phone: "9876543210", area: "Indiranagar", lang: "en", note: "காரம் குறைவாக", items: { chapati: 2 } },
  { name: "Priya", phone: "9123456780", area: "Domlur", lang: "hi", note: "प्याज़ मत डालना", items: { chapati: 1, bbb: 2 } },
  { name: "ಅರುಣ್", phone: "9988776655", area: "Indiranagar", lang: "kn", note: null, items: { bbb: 1, payasa: 1 } },
  { name: "Meera", phone: "9811122233", area: "Domlur", lang: "en", note: "Please ring the bell twice", items: { bbb: 3, payasa: 3 } },
  { name: "Sanjay", phone: "9900011122", area: "Indiranagar", lang: "hi", note: null, items: { chapati: 2, payasa: 2 } },
  { name: "ಕಾವ್ಯ", phone: "9845098450", area: "Domlur", lang: "kn", note: "ಕಡಿಮೆ ಎಣ್ಣೆ", items: { chapati: 1 } },
  { name: "Farhan", phone: "9741234567", area: "Indiranagar", lang: "en", note: null, items: { bbb: 2 } },
];
const CANCELLED = "Sanjay"; // shows that cancelled orders drop out of the totals

const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());

const db = await connect();
await db.beginTransaction();

await db.query("DELETE FROM conversations WHERE token = ?", [OWNER_TOKEN]);
await db.query("DELETE FROM kitchens WHERE slug = ?", [SLUG]); // cascades to menus, orders and conversations
const [k] = await db.query(
  `INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, timezone, domain, status)
   VALUES (?, ?, 'kn', ?, ?, 30, ?, 'lakshmitiffins.in', 'live')`,
  [SLUG, kitchen.name, kitchen.area, JSON.stringify(kitchen.translations), TIMEZONE],
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
    [k.insertId, dish.name, dish.price, JSON.stringify(dish.translations)],
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
console.log(`Customer page: /k/${SLUG}`);
console.log(`Owner page:    /owner?t=${OWNER_TOKEN}`);
