"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { fill, type Dictionary, type Lang } from "@/lib/i18n";
import type { MenuDish } from "@/lib/menu";
import styles from "./menu.module.css";
import { forget, parse, readLast, readMe, remember, subscribe, type LastOrder, type Me } from "./remember";

type Props = { slug: string; lang: Lang; t: Dictionary; dishes: MenuDish[] };

const MAX_PER_DISH = 20;

// crypto.randomUUID needs HTTPS; the fallback keeps the form working on a plain-HTTP test address.
function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type Placed = {
  id: number;
  name: string;
  total: number;
  whatsapp: { url: string; paidUrl: string } | null;
  upiUri: string | null;
};

// The UPI payment link drawn as a QR code, for paying from another phone. Made in the browser.
function UpiQr({ uri, label }: { uri: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(uri, { width: 480, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [uri]);
  // eslint-disable-next-line @next/next/no-img-element -- a data URL made on this page; nothing to optimise
  return src ? <img className={styles.qr} src={src} alt={label} width={240} height={240} /> : <div className={styles.qr} aria-hidden="true" />;
}

export default function OrderForm({ slug, lang, t, dishes }: Props) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [paid, setPaid] = useState(false);

  // A returning customer: details and last order remembered on this phone (null on the server).
  const meRaw = useSyncExternalStore(subscribe, readMe, () => null);
  const lastRaw = useSyncExternalStore(subscribe, useMemo(() => readLast(slug), [slug]), () => null);
  const me = useMemo(() => parse<Me>(meRaw), [meRaw]);
  const last = useMemo(() => {
    const items = parse<LastOrder>(lastRaw)?.items ?? {};
    // Only dishes on today's menu and not sold out.
    return dishes.filter((d) => !d.soldOut && items[d.id] > 0).map((d) => ({ dish: d, quantity: Math.min(MAX_PER_DISH, items[d.id]) }));
  }, [lastRaw, dishes]);
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
        const ordered = Object.fromEntries(dishes.filter((d) => (quantities[d.id] ?? 0) > 0).map((d) => [d.id, quantities[d.id]]));
        remember(slug, { name: customerName, phone: String(form.get("phone") ?? ""), area: String(form.get("area") ?? "") }, ordered);
        setPaid(false);
        setPlaced({ id: result.orderId, name: customerName, total: result.total, whatsapp: result.whatsapp ?? null, upiUri: result.upiUri ?? null });
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
    const amount = { amount: placed.total };
    return (
      <section className={styles.placed} role="status">
        <h2>✓ {t.orderPlaced}</h2>
        <p>{fill(t.thanks, { name: placed.name, id: placed.id })}</p>
        <p className={styles.placedTotal}>
          {t.total}: ₹{placed.total}
        </p>
        {placed.upiUri ? (
          <div className={styles.upi}>
            <h3>{fill(t.payUpiTitle, amount)}</h3>
            <UpiQr uri={placed.upiUri} label={fill(t.payUpiTitle, amount)} />
            <p className={styles.whatsappHint}>{t.payUpiHint}</p>
            <a className={styles.upiOpen} href={placed.upiUri}>
              {t.openUpi}
            </a>
            {placed.whatsapp && (
              <label className={styles.paidCheck}>
                <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
                <span>
                  {fill(t.iPaid, amount)}
                  <small>{t.iPaidHint}</small>
                </span>
              </label>
            )}
            <p>{t.orCash}</p>
          </div>
        ) : (
          <p>{t.payOnDelivery}</p>
        )}
        {placed.whatsapp && (
          <>
            <a className={styles.whatsapp} href={paid ? placed.whatsapp.paidUrl : placed.whatsapp.url} target="_blank" rel="noopener noreferrer">
              {t.sendWhatsapp}
            </a>
            <p className={styles.whatsappHint}>{t.sendWhatsappHint}</p>
          </>
        )}
        <button type="button" className={styles.secondary} onClick={startAgain}>
          {t.orderAgain}
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      {me && (
        <div className={styles.welcome}>
          <p>{fill(t.welcomeBack, { name: me.name })}</p>
          {last.length > 0 && (
            <button
              type="button"
              className={styles.again}
              onClick={() => setQuantities(Object.fromEntries(last.map((l) => [l.dish.id, l.quantity])))}
            >
              ↻ {t.sameAsLast}: {last.map((l) => `${l.quantity} × ${l.dish.name}`).join(", ")}
            </button>
          )}
        </div>
      )}
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

      <div className={styles.fields} key={meRaw ?? "new"}>
        <label>
          {t.yourName}
          <input name="name" autoComplete="name" required maxLength={120} defaultValue={me?.name} />
        </label>
        <label>
          {t.phone}
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={20} defaultValue={me?.phone} />
        </label>
        <label>
          {t.area}
          <input name="area" autoComplete="address-level2" required maxLength={160} defaultValue={me?.area} />
        </label>
        {me && (
          <button type="button" className={styles.forget} onClick={forget}>
            {t.forgetMe}
          </button>
        )}
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
