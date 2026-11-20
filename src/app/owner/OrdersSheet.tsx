"use client";

import { useCallback, useEffect, useState } from "react";
import type { OwnerOrdersView } from "@/lib/ownerOrders";
import styles from "./owner.module.css";

type Labels = Record<string, string>;

// "Lakshmi Tiffins" style screen of today's orders: totals to cook at the top, then each order by area.
// It refreshes every 30 seconds while open, so new orders appear without tapping anything.
export default function OrdersSheet({ token, lang, t, onClose }: { token: string | null; lang: string; t: Labels; onClose: () => void }) {
  const [view, setView] = useState<OwnerOrdersView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "no-kitchen" | "error">("loading");

  const load = useCallback(async () => {
    if (!token) return setState("no-kitchen");
    try {
      const response = await fetch(`/api/owner/orders?token=${encodeURIComponent(token)}&lang=${lang}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error();
      if (!result.kitchen) return setState("no-kitchen");
      setView(result.kitchen);
      setState("ready");
    } catch {
      setState((s) => (s === "ready" ? s : "error")); // keep showing the last list if a refresh fails
    }
  }, [token, lang]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const timer = setInterval(load, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  // Placed orders grouped by area, so deliveries can be planned; cancelled ones listed after.
  const placed = view?.orders.filter((o) => o.status === "placed") ?? [];
  const cancelled = view?.orders.filter((o) => o.status === "cancelled") ?? [];
  const areas = [...new Set(placed.map((o) => o.area))];

  // "Mark returned": the customer's dabbas are back. Shown as done at once, then the list reloads.
  async function boxesBack(phone: string) {
    if (!token) return;
    setView((v) => v && { ...v, orders: v.orders.map((o) => (o.phone === phone ? { ...o, boxesOut: 0 } : o)) });
    await fetch("/api/owner/boxes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, phone }) }).catch(() => {});
    load();
  }

  const status = view
    ? {
        open: view.cutoffTime ? `${t.ordersOpenUntil} ${view.cutoffTime.slice(0, 5)}` : t.ordersOpen,
        closed: t.ordersClosed,
        holiday: t.ordersHoliday,
        none: t.ordersNoMenu,
      }[view.menuState]
    : "";

  return (
    <div className={styles.sheet} role="dialog" aria-modal="true" aria-label={t.ordersTitle}>
      <div className={styles.sheetTop}>
        <strong>{t.ordersTitle}</strong>
        <span className={styles.sheetTopActions}>
          <button type="button" className={styles.link} onClick={load}>
            {t.refresh}
          </button>
          <button type="button" className={styles.link} onClick={onClose}>
            {t.close}
          </button>
        </span>
      </div>

      <div className={styles.ordersBody}>
        {state === "loading" && <p className={styles.hint}>…</p>}
        {state === "no-kitchen" && <p className={styles.notice}>{t.ordersNoKitchen}</p>}
        {state === "error" && <p className={styles.error}>{t.ordersError}</p>}

        {state === "ready" && view && (
          <>
            <p className={styles.ordersMeta}>
              {view.kitchenName} · {view.date} · {status}
            </p>

            <div className={styles.ordersSummary}>
              <div>
                <strong>{view.orderCount}</strong>
                <span>{t.ordersCount}</span>
              </div>
              <div>
                <strong>{view.portions}</strong>
                <span>{t.ordersPlates}</span>
              </div>
              <div>
                <strong>₹{view.revenue}</strong>
                <span>{t.ordersTotal}</span>
              </div>
              {view.usesDabbas && (
                <div>
                  <strong>{view.boxesOut}</strong>
                  <span>🥡 {t.dabbasOut}</span>
                </div>
              )}
            </div>

            {view.totals.length > 0 && (
              <section>
                <h2 className={styles.ordersHeading}>{t.toCook}</h2>
                <ul className={styles.cookList}>
                  {view.totals.map((d) => (
                    <li key={d.dish}>
                      <span className={styles.cookQty}>{d.quantity}</span>
                      <span>{d.dish}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {placed.length === 0 && <p className={styles.notice}>{t.ordersNone}</p>}

            {areas.map((area) => (
              <section key={area}>
                <h2 className={styles.ordersHeading}>📍 {area}</h2>
                <ul className={styles.orderList}>
                  {placed
                    .filter((o) => o.area === area)
                    .map((o) => (
                      <li key={o.id} className={styles.orderCard}>
                        <div className={styles.orderTop}>
                          <strong>{o.customerName}</strong>
                          <span>₹{o.amount}</span>
                        </div>
                        <div className={styles.orderItems}>{o.items.map((i) => `${i.quantity} × ${i.dish}`).join(", ")}</div>
                        {o.address && (
                          <div className={styles.orderAddress}>
                            <span>🏠 {o.address}</span>
                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.address}, ${o.area}`)}`} target="_blank" rel="noopener noreferrer">
                              {t.openMap}
                            </a>
                          </div>
                        )}
                        {o.note && (
                          <div className={o.allergy ? styles.orderNoteAlert : styles.orderNote}>
                            {o.allergy && <strong className={styles.alertLabel}>⚠️ {t.allergyAlert}</strong>}
                            “{o.noteTranslated ?? o.note}”
                            {o.noteTranslated && <span className={styles.orderNoteOriginal}>{o.note}</span>}
                          </div>
                        )}
                        {view.usesDabbas && o.boxesOut > 0 && (
                          <div className={styles.dabbas}>
                            <span>🥡 {t.dabbasWith.replace("{count}", String(o.boxesOut))}</span>
                            <button type="button" onClick={() => boxesBack(o.phone)}>
                              {t.markReturned}
                            </button>
                          </div>
                        )}
                        <div className={styles.orderFoot}>
                          <a href={`tel:+91${o.phone}`}>📞 {o.phone}</a>
                          <span>
                            #{o.id} · {o.placedAt}
                          </span>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            ))}

            {cancelled.length > 0 && (
              <section>
                <h2 className={styles.ordersHeading}>{t.ordersCancelled}</h2>
                <ul className={styles.orderList}>
                  {cancelled.map((o) => (
                    <li key={o.id} className={styles.orderCardCancelled}>
                      <div className={styles.orderTop}>
                        <strong>{o.customerName}</strong>
                        <span>₹{o.amount}</span>
                      </div>
                      <div className={styles.orderItems}>{o.items.map((i) => `${i.quantity} × ${i.dish}`).join(", ")}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
