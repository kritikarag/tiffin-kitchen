"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { fill, type Dictionary, type Lang } from "@/lib/i18n";
import type { TrackedOrder } from "@/lib/track";
import { parse, readOrders, subscribe } from "../k/[slug]/remember";
import styles from "./orders.module.css";

// Orders from this phone whose arrival the customer hasn't confirmed yet: on the way, or from an earlier day.
export function usePendingConfirmations(lang: Lang) {
  const raw = useSyncExternalStore(subscribe, readOrders, () => null);
  const [pending, setPending] = useState<TrackedOrder[]>([]);
  const load = useCallback(async () => {
    const codes = parse<string[]>(raw) ?? [];
    if (codes.length === 0) return setPending([]);
    try {
      const response = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: codes.slice(0, 20), lang }),
        cache: "no-store",
      });
      if (response.ok) setPending(((await response.json()).orders as TrackedOrder[]).filter((o) => o.needsConfirmation));
    } catch {
      // Offline: don't block ordering on a check that couldn't run.
    }
  }, [raw, lang]);
  useEffect(() => {
    const first = setTimeout(load, 0);
    return () => clearTimeout(first);
  }, [load]);
  return { pending, reload: load };
}

// "Did your last tiffin arrive?" with Yes and No, shown above the order form. Answering is required before
// the next order, so every order ends with the customer's own word on whether it arrived.
export default function PendingConfirm({ order, lang, t, onAnswered }: { order: TrackedOrder; lang: Lang; t: Dictionary; onAnswered: () => void }) {
  const [sending, setSending] = useState(false);
  const day = new Intl.DateTimeFormat(`${lang}-IN`, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${order.date}T12:00:00`));

  async function answer(arrived: boolean) {
    setSending(true);
    try {
      await fetch("/api/track/received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: order.code, arrived }),
      });
    } finally {
      setSending(false);
      onAnswered();
    }
  }

  return (
    <section className={styles.confirm} aria-labelledby={`confirm-${order.code}`}>
      <h2 id={`confirm-${order.code}`}>{t.confirmTitle}</h2>
      <p>{fill(t.confirmLine, { kitchen: order.kitchen, day, id: order.id })}</p>
      <p className={styles.confirmItems}>{order.items.map((i) => `${i.quantity} × ${i.dish}`).join(", ")}</p>
      <div className={styles.confirmActions}>
        <button type="button" onClick={() => answer(true)} disabled={sending}>
          ✓ {t.confirmYes}
        </button>
        <button type="button" className={styles.confirmNo} onClick={() => answer(false)} disabled={sending}>
          {t.confirmNo}
        </button>
      </div>
    </section>
  );
}
