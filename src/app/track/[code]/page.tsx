import type { RowDataPacket } from "mysql2";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { isDelivery } from "@/lib/delivery";
import { fill, getDictionary, isLang, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { inLanguage } from "@/lib/menu";
import Refresh from "./Refresh";
import styles from "./track.module.css";

// The customer's tracking page: where their tiffin is, from order received to delivered. Reached only
// through the random code in its link, so it shows nothing to anyone who doesn't have the link.

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = { title: "Your order · Tiffin", robots: { index: false } };

export default function TrackPage({ params }: Props) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p>…</p>}>
        <Tracking params={params} />
      </Suspense>
    </main>
  );
}

const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) ?? {};

async function Tracking({ params }: Props) {
  await connection();
  const { code } = await params;
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value;
  if (!/^[A-Za-z0-9_-]{16}$/.test(code)) return <NotFound lang={isLang(cookieLang) ? cookieLang : "en"} />;

  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT o.id, o.customer_name, o.area, o.address, o.status, o.delivery, o.customer_language,
            k.name, k.translations, k.owner_whatsapp, mi.name_original AS dish, mi.translations AS dish_tr, oi.quantity, oi.unit_price
       FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id JOIN kitchens k ON k.id = dm.kitchen_id
       JOIN order_items oi ON oi.order_id = o.id JOIN menu_items mi ON mi.id = oi.menu_item_id
      WHERE o.track_code = ? ORDER BY mi.id`,
    [code],
  );
  const order = rows[0];
  const lang: Lang = isLang(cookieLang) ? cookieLang : isLang(order?.customer_language) ? order.customer_language : "en";
  if (!order) return <NotFound lang={lang} />;
  const t = getDictionary(lang);

  const kitchen = inLanguage<{ name?: string }>(parse(order.translations), lang)?.name || order.name;
  const total = rows.reduce((sum, r) => sum + r.quantity * r.unit_price, 0);
  const delivery = isDelivery(order.delivery) ? order.delivery : "waiting";
  const stages = [
    ["waiting", "🧾", t.trackPlaced],
    ["preparing", "🍳", t.trackPreparing],
    ["on_the_way", "🛵", t.trackOnTheWay],
    ["delivered", "✓", t.trackDelivered],
  ] as const;
  const reached = stages.findIndex(([s]) => s === delivery);

  return (
    <div lang={lang}>
      <p className={styles.from}>{fill(t.trackFrom, { kitchen })}</p>
      <h1>
        {t.trackTitle} <span className={styles.id}>#{order.id}</span>
      </h1>

      {order.status === "cancelled" ? (
        <p className={styles.cancelled}>{t.trackCancelled}</p>
      ) : (
        <ol className={styles.stages}>
          {stages.map(([stage, icon, label], i) => (
            <li key={stage} className={i < reached ? styles.done : i === reached ? styles.now : styles.next} aria-current={i === reached ? "step" : undefined}>
              <span className={styles.icon} aria-hidden="true">
                {icon}
              </span>
              {label}
            </li>
          ))}
        </ol>
      )}

      <section className={styles.card}>
        <ul>
          {rows.map((r, i) => (
            <li key={i}>
              {r.quantity} × {inLanguage<{ name?: string }>(parse(r.dish_tr), lang)?.name || r.dish}
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          {t.total}: ₹{total}
        </p>
        <p className={styles.address}>🏠 {order.address ? `${order.address}, ${order.area}` : order.area}</p>
      </section>

      {order.owner_whatsapp && (
        <a className={styles.contact} href={`https://wa.me/91${order.owner_whatsapp}`} target="_blank" rel="noopener noreferrer">
          WhatsApp {kitchen}
        </a>
      )}
      {order.status !== "cancelled" && delivery !== "delivered" && <Refresh label={t.trackRefresh} />}
    </div>
  );
}

function NotFound({ lang }: { lang: Lang }) {
  return <p className={styles.cancelled}>{getDictionary(lang).trackNotFound}</p>;
}
