import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { fill, getDictionary, isLang, LANG_COOKIE, type Lang } from "@/lib/i18n";
import { trackOrders } from "@/lib/track";
import RememberOrder from "./RememberOrder";
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

async function Tracking({ params }: Props) {
  await connection();
  const { code } = await params;
  const cookieLang = (await cookies()).get(LANG_COOKIE)?.value;

  const [order] = await trackOrders([code], isLang(cookieLang) ? cookieLang : "en");
  const lang: Lang = isLang(cookieLang) ? cookieLang : "en";
  if (!order) return <NotFound lang={lang} />;
  const t = getDictionary(lang);
  const kitchen = order.kitchen;
  const total = order.total;
  const delivery = order.delivery;
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
          {order.items.map((item, i) => (
            <li key={i}>
              {item.quantity} × {item.dish}
            </li>
          ))}
        </ul>
        <p className={styles.total}>
          {t.total}: ₹{total}
        </p>
        <p className={styles.address}>🏠 {order.address ? `${order.address}, ${order.area}` : order.area}</p>
      </section>

      {order.ownerWhatsapp && (
        <a className={styles.contact} href={`https://wa.me/91${order.ownerWhatsapp}`} target="_blank" rel="noopener noreferrer">
          WhatsApp {kitchen}
        </a>
      )}
      {order.status !== "cancelled" && delivery !== "delivered" && <Refresh label={t.trackRefresh} />}
      <RememberOrder code={order.code} />
      <a className={styles.all} href="/orders">
        {t.myOrders}
      </a>
    </div>
  );
}

function NotFound({ lang }: { lang: Lang }) {
  return <p className={styles.cancelled}>{getDictionary(lang).trackNotFound}</p>;
}
