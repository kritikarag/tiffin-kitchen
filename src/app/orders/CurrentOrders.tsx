"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { fill, type Dictionary, type Lang } from "@/lib/i18n";
import type { TrackedOrder } from "@/lib/track";
import { parse, readOrders, subscribe } from "../k/[slug]/remember";
import styles from "./orders.module.css";
import Icon from "@/components/Icon";

const STAGES = ["waiting", "preparing", "on_the_way", "delivered"] as const;
const ICON = { waiting: "receipt", preparing: "flame", on_the_way: "bike", delivered: "delivered" } as const;
const LABEL = { waiting: "trackPlaced", preparing: "trackPreparing", on_the_way: "trackOnTheWay", delivered: "trackDelivered" } as const;

// A card for each order from this phone that is still on its way, shown wherever the customer lands
// (home page, kitchen list, that kitchen's menu), so they never have to go looking for it.
// Shows nothing on a phone with no current order. Refreshes every 30 seconds.
export default function CurrentOrders({ lang, t, slug }: { lang: Lang; t: Dictionary; slug?: string }) {
  const raw = useSyncExternalStore(subscribe, readOrders, () => null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  const load = useCallback(async () => {
    const codes = parse<string[]>(raw) ?? [];
    if (codes.length === 0) return setOrders([]);
    try {
      const response = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: codes.slice(0, 10), lang }),
        cache: "no-store",
      });
      if (response.ok) setOrders(((await response.json()).orders as TrackedOrder[]).filter((o) => o.current));
    } catch {
      // Offline: keep showing what we had.
    }
  }, [raw, lang]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const shown = slug ? orders.filter((o) => o.slug === slug) : orders;
  if (shown.length === 0) return null;
  return (
    <div className={styles.current}>
      {shown.map((o) => {
        const at = STAGES.indexOf(o.delivery);
        return (
          <Link key={o.code} href={`/track/${o.code}`} className={styles.currentCard}>
            <span className={styles.currentTop}>
              <strong>
                {t.trackTitle} #{o.id}
              </strong>
              <span>{fill(t.trackFrom, { kitchen: o.kitchen })}</span>
            </span>
            <span className={styles.currentStage}>
              <Icon name={ICON[o.delivery]} /> {t[LABEL[o.delivery]]}
            </span>
            <span className={styles.progress} aria-hidden="true">
              {STAGES.map((s, i) => (
                <span key={s} className={i <= at ? styles.stepOn : styles.stepOff} />
              ))}
            </span>
            <span className={styles.currentLink}>{t.myOrdersTrack} <Icon name="chevronRight" /></span>
          </Link>
        );
      })}
    </div>
  );
}
