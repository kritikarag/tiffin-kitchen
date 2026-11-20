"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Dictionary, Lang } from "@/lib/i18n";
import type { TrackedOrder } from "@/lib/track";
import { parse, readOrders, subscribe } from "../k/[slug]/remember";
import styles from "./orders.module.css";
import Icon, { type IconName } from "@/components/Icon";

// Reads the phone's list of tracking codes, asks the server for each order's current state, and refreshes
// every 30 seconds while any order is still on its way.
export default function MyOrders({ lang, t }: { lang: Lang; t: Dictionary }) {
  const raw = useSyncExternalStore(subscribe, readOrders, () => null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const codes = parse<string[]>(raw) ?? [];
    if (codes.length === 0) return setOrders([]);
    try {
      const response = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes, lang }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error();
      setOrders((await response.json()).orders);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [raw, lang]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);

  const hasCurrent = orders?.some((o) => o.current) ?? false;
  useEffect(() => {
    if (!hasCurrent) return;
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [hasCurrent, load]);

  if (failed && !orders) return <p className={styles.notice}>{t.myOrdersError}</p>;
  if (!orders) return <p className={styles.muted}>…</p>;
  if (orders.length === 0) {
    return (
      <>
        <p className={styles.notice}>{t.myOrdersEmpty}</p>
        <Link className={styles.primary} href="/k">
          {t.kitchensTitle}
        </Link>
      </>
    );
  }

  const current = orders.filter((o) => o.current);
  const past = orders.filter((o) => !o.current);
  return (
    <>
      {current.length > 0 && (
        <section>
          <h2 className={styles.heading}>{t.myOrdersNow}</h2>
          <ul className={styles.list}>
            {current.map((o) => (
              <OrderCard key={o.code} order={o} lang={lang} t={t} />
            ))}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className={styles.heading}>{t.myOrdersPast}</h2>
          <ul className={styles.list}>
            {past.map((o) => (
              <OrderCard key={o.code} order={o} lang={lang} t={t} />
            ))}
          </ul>
        </section>
      )}
      <p className={styles.muted}>{t.myOrdersNote}</p>
    </>
  );
}

const STAGE: Record<TrackedOrder["delivery"], [icon: IconName, key: "trackPlaced" | "trackPreparing" | "trackOnTheWay" | "trackDelivered"]> = {
  waiting: ["receipt", "trackPlaced"],
  preparing: ["flame", "trackPreparing"],
  on_the_way: ["bike", "trackOnTheWay"],
  delivered: ["delivered", "trackDelivered"],
};

function OrderCard({ order, lang, t }: { order: TrackedOrder; lang: Lang; t: Dictionary }) {
  const [icon, key] = STAGE[order.delivery];
  const day = new Intl.DateTimeFormat(`${lang}-IN`, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${order.date}T12:00:00`));
  return (
    <li className={order.current ? styles.cardNow : styles.card}>
      <div className={styles.top}>
        <strong>{order.kitchen}</strong>
        <span>₹{order.total}</span>
      </div>
      <div className={styles.meta}>
        {day} · #{order.id}
      </div>
      <div className={styles.items}>{order.items.map((i) => `${i.quantity} × ${i.dish}`).join(", ")}</div>
      <span className={order.status === "cancelled" ? styles.badgeCancelled : order.delivery === "delivered" ? styles.badgeDone : styles.badge}>
        {order.status === "cancelled" ? t.myOrdersCancelled : <><Icon name={icon} /> {t[key]}</>}
      </span>
      <div className={styles.actions}>
        <Link href={`/track/${order.code}`}>{t.myOrdersTrack}</Link>
        <Link href={`/k/${order.slug}`}>{t.orderAgain}</Link>
      </div>
    </li>
  );
}

