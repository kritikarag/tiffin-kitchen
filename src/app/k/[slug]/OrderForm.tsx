"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fill, type Dictionary, type Lang } from "@/lib/i18n";
import type { MenuDish } from "@/lib/menu";
import styles from "./menu.module.css";

type Props = { slug: string; lang: Lang; t: Dictionary; dishes: MenuDish[] };

const MAX_PER_DISH = 20;

// crypto.randomUUID needs HTTPS; the fallback keeps the form working on a plain-HTTP test address.
function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function OrderForm({ slug, lang, t, dishes }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ id: number; name: string; total: number } | null>(null);
  // One key per order attempt: a double tap or a retry sends the same key, so only one order is created.
  const idempotencyKey = useRef<string | null>(null);

  const total = dishes.reduce((sum, dish) => sum + dish.price * (quantities[dish.id] ?? 0), 0);

  function change(id: number, delta: number) {
    setQuantities((q) => ({ ...q, [id]: Math.min(MAX_PER_DISH, Math.max(0, (q[id] ?? 0) + delta)) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (total === 0) {
      setError(t.err_empty);
      return;
    }
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("name") ?? "").trim();
    idempotencyKey.current ??= newKey();
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          idempotencyKey: idempotencyKey.current,
          customerName,
          phone: form.get("phone"),
          area: form.get("area"),
          note: form.get("note"),
          language: lang,
          items: dishes
            .filter((dish) => (quantities[dish.id] ?? 0) > 0)
            .map((dish) => ({ menuItemId: dish.id, quantity: quantities[dish.id] })),
        }),
      });
      const result = await response.json();
      if (result.ok) {
        setPlaced({ id: result.orderId, name: customerName, total: result.total });
        return;
      }
      const messages: Record<string, string> = {
        empty: t.err_empty,
        invalid: t.err_invalid,
        closed: t.err_closed,
        not_found: t.err_closed,
        sold_out: t.err_sold_out,
        capacity: t.err_capacity,
      };
      setError(messages[result.error] ?? t.err_generic);
      // The menu changed under the customer, so show them the current one.
      if (result.error === "sold_out" || result.error === "closed") router.refresh();
    } catch {
      setError(t.err_generic); // network failure: the same key is reused on retry
    } finally {
      setSending(false);
    }
  }

  function startAgain() {
    idempotencyKey.current = null;
    setQuantities({});
    setPlaced(null);
    router.refresh();
  }

  if (placed) {
    return (
      <section className={styles.placed} role="status">
        <h2>✓ {t.orderPlaced}</h2>
        <p>{fill(t.thanks, { name: placed.name, id: placed.id })}</p>
        <p className={styles.placedTotal}>
          {t.total}: ₹{placed.total}
        </p>
        <p>{t.payOnDelivery}</p>
        <button type="button" className={styles.secondary} onClick={startAgain}>
          {t.orderAgain}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <ul className={styles.dishes}>
        {dishes.map((dish) => {
          const quantity = quantities[dish.id] ?? 0;
          return (
            <li key={dish.id} className={dish.soldOut ? styles.dishSoldOut : styles.dish}>
              <div className={styles.dishText}>
                <strong>{dish.name}</strong>
                {dish.description && <span>{dish.description}</span>}
                <span className={styles.price}>₹{dish.price}</span>
              </div>
              {dish.soldOut ? (
                <span className={styles.soldOut}>{t.soldOut}</span>
              ) : (
                <div className={styles.stepper}>
                  <button type="button" onClick={() => change(dish.id, -1)} disabled={quantity === 0} aria-label={`− ${dish.name}`}>
                    −
                  </button>
                  <output aria-live="polite">{quantity}</output>
                  <button type="button" onClick={() => change(dish.id, 1)} disabled={quantity >= MAX_PER_DISH} aria-label={`+ ${dish.name}`}>
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={styles.fields}>
        <label>
          {t.yourName}
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
        <label>
          {t.phone}
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} />
        </label>
        <label>
          {t.area}
          <input name="area" autoComplete="address-level2" required maxLength={160} />
        </label>
        <label>
          {t.note}
          <textarea name="note" rows={2} maxLength={500} />
        </label>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <div className={styles.submitBar}>
        <span className={styles.total}>
          {t.total}: <strong>₹{total}</strong>
        </span>
        <button type="submit" className={styles.primary} disabled={sending}>
          {sending ? t.placing : t.placeOrder}
        </button>
      </div>
      <p className={styles.pay}>{t.payOnDelivery}</p>
    </form>
  );
}
