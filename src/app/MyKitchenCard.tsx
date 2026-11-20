"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import Icon from "@/components/Icon";
import type { HomeCopy } from "./homeCopy";
import styles from "./home.module.css";

// The cook's side of the home page: on a browser that runs a kitchen, a card with today's orders and a way
// back into the kitchen, the way a customer sees their current order. Nothing for anyone else.
const TOKEN_KEY = "tiffin-owner-token"; // the owner page keeps her private link's key under this name

function readToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function onStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

type Summary = { name: string; orders: number; delivered: number };

export default function MyKitchenCard({ t, lang }: { t: HomeCopy; lang: string }) {
  const token = useSyncExternalStore(onStorage, readToken, () => null);
  const [kitchen, setKitchen] = useState<Summary | null>(null);

  useEffect(() => {
    if (!token) return;
    let live = true;
    fetch(`/api/owner/orders?token=${encodeURIComponent(token)}&lang=${lang}&notes=0`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && d.kitchen && setKitchen({ name: d.kitchen.kitchenName, orders: d.kitchen.orderCount, delivered: d.kitchen.deliveredCount }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [token, lang]);

  if (!token || !kitchen) return null;
  return (
    <Link href="/owner" className={styles.kitchenCard}>
      <span className={styles.kitchenCardTop}>
        <Icon name="key" />
        <strong>
          {t.myKitchen}: {kitchen.name}
        </strong>
      </span>
      <span>{t.myKitchenOrders.replace("{count}", String(kitchen.orders)).replace("{delivered}", String(kitchen.delivered))}</span>
      <span className={styles.kitchenCardOpen}>
        {t.myKitchenOpen} <Icon name="chevronRight" />
      </span>
    </Link>
  );
}
