import type { RowDataPacket } from "mysql2";
import { db, parseJson } from "./db";
import type { Lang } from "./i18n";
import { isPastCutoff, nowInZone } from "./time";

type Translations = Partial<Record<Lang, { name?: string; description?: string }>>;

export type MenuDish = {
  id: number;
  name: string;
  description: string;
  price: number;
  soldOut: boolean;
};

export type MenuState = "open" | "closed" | "holiday" | "none";

export type MenuView = {
  kitchen: { name: string; deliveryArea: string };
  state: MenuState;
  cutoffTime: string | null;
  dishes: MenuDish[];
};

// Everything the public page needs for one kitchen today, in the customer's language.
// Returns null when the kitchen does not exist or is not live yet.
export async function getTodayMenu(slug: string, lang: Lang): Promise<MenuView | null> {
  const [kitchens] = await db().query<RowDataPacket[]>(
    "SELECT id, name, delivery_area, translations, timezone FROM kitchens WHERE slug = ? AND status = 'live'",
    [slug],
  );
  const kitchen = kitchens[0];
  if (!kitchen) return null;

  const kitchenText = parseJson<Partial<Record<Lang, { name?: string; delivery_area?: string }>>>(kitchen.translations, {})[lang];
  const view: MenuView = {
    kitchen: {
      name: kitchenText?.name || kitchen.name, // fall back to what the owner said
      deliveryArea: kitchenText?.delivery_area || kitchen.delivery_area,
    },
    state: "none",
    cutoffTime: null,
    dishes: [],
  };

  const now = nowInZone(kitchen.timezone);
  const [menus] = await db().query<RowDataPacket[]>(
    "SELECT id, cutoff_time, status FROM daily_menus WHERE kitchen_id = ? AND menu_date = ?",
    [kitchen.id, now.date],
  );
  const menu = menus[0];
  if (!menu) return view;

  view.cutoffTime = menu.cutoff_time;
  if (menu.status === "holiday") {
    view.state = "holiday";
    return view;
  }
  view.state = menu.status === "closed" || isPastCutoff(now.time, menu.cutoff_time) ? "closed" : "open";

  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT mi.id, mi.name_original, mi.translations, dmi.price, dmi.sold_out
       FROM daily_menu_items dmi
       JOIN menu_items mi ON mi.id = dmi.menu_item_id
      WHERE dmi.daily_menu_id = ?
      ORDER BY mi.id`,
    [menu.id],
  );
  view.dishes = rows.map((row) => {
    const translation = parseJson<Translations>(row.translations, {})[lang];
    return {
      id: row.id,
      name: translation?.name || row.name_original, // fall back to what the owner said
      description: translation?.description ?? "",
      price: row.price,
      soldOut: Boolean(row.sold_out),
    };
  });
  return view;
}

export type KitchenCard = {
  slug: string;
  name: string;
  deliveryArea: string;
  state: MenuState;
  cutoffTime: string | null;
  dishes: string[]; // today's dishes, in the customer's language
  lowestPrice: number | null;
};

// Every live kitchen with today's state, for the customer list at /k. Open kitchens come first.
export async function listKitchens(lang: Lang): Promise<KitchenCard[]> {
  const [kitchens] = await db().query<RowDataPacket[]>(
    "SELECT id, slug, name, delivery_area, translations, timezone FROM kitchens WHERE status = 'live' ORDER BY name LIMIT 100",
  );
  const cards: KitchenCard[] = [];
  for (const k of kitchens) {
    const text = parseJson<Partial<Record<Lang, { name?: string; delivery_area?: string }>>>(k.translations, {})[lang];
    const now = nowInZone(k.timezone);
    const [menus] = await db().query<RowDataPacket[]>(
      "SELECT id, cutoff_time, status FROM daily_menus WHERE kitchen_id = ? AND menu_date = ?",
      [k.id, now.date],
    );
    const menu = menus[0];
    const card: KitchenCard = {
      slug: k.slug,
      name: text?.name || k.name,
      deliveryArea: text?.delivery_area || k.delivery_area,
      state: "none",
      cutoffTime: menu?.cutoff_time ?? null,
      dishes: [],
      lowestPrice: null,
    };
    if (menu) {
      card.state =
        menu.status === "holiday" ? "holiday" : menu.status === "closed" || isPastCutoff(now.time, menu.cutoff_time) ? "closed" : "open";
      const [rows] = await db().query<RowDataPacket[]>(
        `SELECT mi.name_original, mi.translations, dmi.price FROM daily_menu_items dmi
           JOIN menu_items mi ON mi.id = dmi.menu_item_id WHERE dmi.daily_menu_id = ? ORDER BY mi.id`,
        [menu.id],
      );
      card.dishes = rows.map((r) => parseJson<Translations>(r.translations, {})[lang]?.name || r.name_original);
      card.lowestPrice = rows.length ? Math.min(...rows.map((r) => r.price as number)) : null;
    }
    cards.push(card);
  }
  const order: Record<MenuState, number> = { open: 0, closed: 1, none: 2, holiday: 3 };
  return cards.sort((a, b) => order[a.state] - order[b.state]);
}
