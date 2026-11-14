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
    "SELECT id, name, delivery_area, timezone FROM kitchens WHERE slug = ? AND status = 'live'",
    [slug],
  );
  const kitchen = kitchens[0];
  if (!kitchen) return null;

  const view: MenuView = {
    kitchen: { name: kitchen.name, deliveryArea: kitchen.delivery_area },
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
