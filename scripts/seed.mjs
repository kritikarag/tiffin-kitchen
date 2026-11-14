// Creates a demo kitchen with today's menu. Run with: npm run db:seed
// Optional: SEED_CUTOFF=11:00 npm run db:seed   (default 22:00, so the page stays open while you test)
import { connect } from "./db.mjs";

const SLUG = "ammas-kitchen";
const TIMEZONE = "Asia/Kolkata";
const cutoff = `${process.env.SEED_CUTOFF ?? "22:00"}:00`;

const dishes = [
  {
    name: "ಅನ್ನ ಸಾಂಬಾರ್ ಊಟ",
    price: 80,
    translations: {
      kn: { name: "ಅನ್ನ ಸಾಂಬಾರ್ ಊಟ", description: "ಅನ್ನ, ಸಾಂಬಾರ್, ಪಲ್ಯ ಮತ್ತು ಮೊಸರು" },
      hi: { name: "अन्ना सांबार ऊटा", description: "चावल, सांबर, सब्ज़ी और दही" },
      en: { name: "Anna Sambar Oota", description: "Rice with sambar, a vegetable palya and curd" },
    },
  },
  {
    name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್",
    price: 70,
    translations: {
      kn: { name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", description: "ಬೂಂದಿ ಜೊತೆ ಬಿಸಿ ಬೇಳೆ ಬಾತ್" },
      hi: { name: "बिसि बेले बात", description: "मसालेदार दाल-चावल, बूंदी के साथ" },
      en: { name: "Bisi Bele Bath", description: "Spiced rice and lentils cooked together, with boondi" },
    },
  },
  {
    name: "ಚಪಾತಿ ಪಲ್ಯ",
    price: 60,
    translations: {
      kn: { name: "ಚಪಾತಿ ಪಲ್ಯ", description: "ಮೂರು ಚಪಾತಿ ಮತ್ತು ಪಲ್ಯ" },
      hi: { name: "चपाती पल्या", description: "तीन चपाती और सूखी सब्ज़ी" },
      en: { name: "Chapati Palya", description: "Three chapatis with a dry vegetable curry" },
    },
  },
];

// Today's date in the kitchen's time zone, as YYYY-MM-DD.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(new Date());

const db = await connect();
await db.beginTransaction();

await db.query("DELETE FROM kitchens WHERE slug = ?", [SLUG]); // cascades to everything below it
const [kitchen] = await db.query(
  `INSERT INTO kitchens (slug, name, owner_language, delivery_area, capacity_per_day, timezone, status)
   VALUES (?, ?, 'kn', ?, 40, ?, 'live')`,
  [SLUG, "Amma's Kitchen", "Indiranagar, Domlur, HAL 2nd Stage", TIMEZONE],
);

const [menu] = await db.query(
  "INSERT INTO daily_menus (kitchen_id, menu_date, cutoff_time, status) VALUES (?, ?, ?, 'open')",
  [kitchen.insertId, today, cutoff],
);

for (const dish of dishes) {
  const [item] = await db.query(
    "INSERT INTO menu_items (kitchen_id, name_original, price, unit, translations) VALUES (?, ?, ?, 'plate', ?)",
    [kitchen.insertId, dish.name, dish.price, JSON.stringify(dish.translations)],
  );
  await db.query("INSERT INTO daily_menu_items (daily_menu_id, menu_item_id, price) VALUES (?, ?, ?)", [
    menu.insertId,
    item.insertId,
    dish.price,
  ]);
}

await db.commit();
await db.end();
console.log(`Seeded "${SLUG}" with ${dishes.length} dishes for ${today}, cut-off ${cutoff}. Open /k/${SLUG}`);
