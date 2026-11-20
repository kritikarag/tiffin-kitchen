// A ready-made demo: Lakshmi Tiffins, live, with today's menu and orders in three languages,
// plus an owner conversation already linked to the kitchen, and three more kitchens so the customer
// list at /k has choices. No API key is needed; all text is written here.
// Run with: npm run db:seed-demo     Optional: DEMO_CUTOFF=13:00 npm run db:seed-demo  (default 23:30)
// Running it again resets the demo kitchens and their orders.
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
// DEMO_OWNER_WHATSAPP=98XXXXXXXX gives Lakshmi a WhatsApp number, so the "Send on WhatsApp" button can be shown.
// Use your own number for the demo video. Without it the button is hidden.
function demoWhatsapp() {
  const digits = (process.env.DEMO_OWNER_WHATSAPP ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : null;
}

await db.beginTransaction();

await db.query("DELETE FROM conversations WHERE token = ?", [OWNER_TOKEN]);
await db.query("DELETE FROM kitchens WHERE slug = ?", [SLUG]); // cascades to menus, orders and conversations
const [k] = await db.query(
  `INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, timezone, domain, owner_whatsapp, status)
   VALUES (?, ?, 'kn', ?, ?, 30, ?, 'lakshmitiffins.in', ?, 'live')`,
  [SLUG, kitchen.name, kitchen.area, JSON.stringify(kitchen.translations), TIMEZONE, demoWhatsapp()],
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

// ---- three more kitchens, for the customer list ----
const t = (kn, hi, en, knD, hiD, enD) => ({
  kn: { name: kn, description: knD },
  hi: { name: hi, description: hiD },
  en: { name: en, description: enD },
});
const others = [
  {
    slug: "annapurna-rasoi",
    owner: "hi",
    capacity: 40,
    names: { kn: ["ಅನ್ನಪೂರ್ಣ ರಸೋಯಿ", "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್, ಕೋರಮಂಗಲ"], hi: ["अन्नपूर्णा रसोई", "एचएसआर लेआउट, कोरमंगला"], en: ["Annapurna Rasoi", "HSR Layout, Koramangala"] },
    status: "open",
    dishes: [
      [110, t("ರಾಜ್ಮಾ ಚಾವಲ್", "राजमा चावल", "Rajma Chawal", "ರಾಜ್ಮಾ ಕರಿ ಮತ್ತು ಅನ್ನ", "घर जैसा राजमा और चावल", "Kidney bean curry with steamed rice")],
      [90, t("ಆಲೂ ಪರಾಠ", "आलू पराठा", "Aloo Paratha", "ಮೊಸರು ಮತ್ತು ಉಪ್ಪಿನಕಾಯಿ ಜೊತೆ", "दही और अचार के साथ दो पराठे", "Two potato-stuffed flatbreads with curd and pickle")],
      [130, t("ದಾಲ್ ತಡ್ಕಾ ಥಾಲಿ", "दाल तड़का थाली", "Dal Tadka Thali", "ದಾಲ್, ಸಬ್ಜಿ, ರೊಟ್ಟಿ, ಅನ್ನ", "दाल, सब्ज़ी, रोटी और चावल", "Dal, a vegetable, rotis and rice")],
    ],
  },
  {
    slug: "fatimas-kitchen",
    owner: "en",
    capacity: 25,
    names: { kn: ["ಫಾತಿಮಾಸ್ ಕಿಚನ್", "ಫ್ರೇಜರ್ ಟೌನ್, ಕಾಕ್ಸ್ ಟೌನ್"], hi: ["फ़ातिमाज़ किचन", "फ़्रेज़र टाउन, कॉक्स टाउन"], en: ["Fatima's Kitchen", "Frazer Town, Cox Town"] },
    status: "open",
    dishes: [
      [180, t("ಚಿಕನ್ ಬಿರಿಯಾನಿ", "चिकन बिरयानी", "Chicken Biryani", "ದಮ್ ಬಿರಿಯಾನಿ, ರಾಯತ ಜೊತೆ", "दम बिरयानी, रायते के साथ", "Dum biryani with raita")],
      [140, t("ವೆಜ್ ಬಿರಿಯಾನಿ", "वेज बिरयानी", "Veg Biryani", "ತರಕಾರಿ ದಮ್ ಬಿರಿಯಾನಿ", "सब्ज़ियों की दम बिरयानी", "Vegetable dum biryani with raita")],
      [60, t("ಫಿರ್ನಿ", "फिरनी", "Phirni", "ಏಲಕ್ಕಿ ಅಕ್ಕಿ ಪಾಯಸ", "इलायची वाली चावल की खीर", "Cardamom rice pudding")],
    ],
  },
  {
    slug: "selvi-idli-mane",
    owner: "kn",
    capacity: 50,
    names: { kn: ["ಸೆಲ್ವಿ ಇಡ್ಲಿ ಮನೆ", "ಜಯನಗರ, ಬಿಟಿಎಂ ಲೇಔಟ್"], hi: ["सेल्वी इडली मने", "जयनगर, बीटीएम लेआउट"], en: ["Selvi Idli Mane", "Jayanagar, BTM Layout"] },
    status: "holiday", // closed today, so the list shows a realistic mix
    dishes: [
      [60, t("ಇಡ್ಲಿ ವಡೆ", "इडली वड़ा", "Idli Vada", "ಎರಡು ಇಡ್ಲಿ, ಒಂದು ವಡೆ, ಚಟ್ನಿ", "दो इडली, एक वड़ा, चटनी", "Two idlis, a vada and chutney")],
      [70, t("ಖಾರಾ ಪೊಂಗಲ್", "खारा पोंगल", "Khara Pongal", "ತುಪ್ಪದ ಅನ್ನ ಬೇಳೆ ಪೊಂಗಲ್", "घी वाला चावल-दाल पोंगल", "Rice and lentils with ghee and pepper")],
    ],
  },
];
for (const other of others) {
  await db.query("DELETE FROM kitchens WHERE slug = ?", [other.slug]);
  const translations = Object.fromEntries(Object.entries(other.names).map(([lang, [name, area]]) => [lang, { name, delivery_area: area }]));
  const [ok] = await db.query(
    `INSERT INTO kitchens (slug, name, owner_language, delivery_area, translations, capacity_per_day, timezone, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'live')`,
    [other.slug, other.names[other.owner][0], other.owner, other.names[other.owner][1], JSON.stringify(translations), other.capacity, TIMEZONE],
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
      JSON.stringify(tr),
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
