"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fill, type Dictionary, type Lang } from "@/lib/i18n";
import type { MenuDish } from "@/lib/menu";
import styles from "./menu.module.css";
import MicButton from "./MicButton";
import PendingConfirm, { usePendingConfirmations } from "../../orders/PendingConfirm";
import { forget, parse, readLast, readMe, remember, rememberOrder, subscribe, type LastOrder, type Me } from "./remember";
import Icon from "@/components/Icon";

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
  trackPath: string | null;
};


export default function OrderForm({ slug, lang, t, dishes }: Props) {
  // The last order must be answered (arrived or not) before a new one can be placed.
  const { pending, reload: reloadPending } = usePendingConfirmations(lang);
  const mic = { speak: t.micSpeak, stop: t.micStop, blocked: t.micBlocked };
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);

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
    if (pending.length) {
      setError(t.confirmFirst);
      document.getElementById("pending-confirm")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (total === 0) {
      setError(t.err_empty);
      return;
    }
    const form = new FormData(event.currentTarget);
    const customerName = String(form.get("name") ?? "").trim();
    // Check each field here, the same way the server does, so the customer is told exactly which one to fix
    // (details saved before the address field existed have no address, for example).
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const digits = value("phone").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    const problem = !customerName
      ? ["name", t.err_name]
      : !/^[6-9]\d{9}$/.test(digits)
        ? ["phone", t.err_phone]
        : !value("area")
          ? ["area", t.err_area]
          : value("address").length < 5
            ? ["address", t.err_address]
            : null;
    if (problem) {
      setError(problem[1]);
      (event.currentTarget.elements.namedItem(problem[0]) as HTMLElement | null)?.focus();
      return;
    }
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
          address: form.get("address"),
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
        remember(
          slug,
          { name: customerName, phone: String(form.get("phone") ?? ""), area: String(form.get("area") ?? ""), address: String(form.get("address") ?? "") },
          ordered,
        );
        if (result.trackPath) rememberOrder(String(result.trackPath).split("/").pop()!);
        setPlaced({ id: result.orderId, name: customerName, total: result.total, whatsapp: result.whatsapp ?? null, trackPath: result.trackPath ?? null });
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
        <h2><Icon name="delivered" /> {t.orderPlaced}</h2>
        <p>{fill(t.thanks, { name: placed.name, id: placed.id })}</p>
        <p className={styles.placedTotal}>
          {t.total}: ₹{placed.total}
        </p>
        {placed.trackPath && (
          <a className={styles.track} href={placed.trackPath}>
            {t.trackOrder}
          </a>
        )}
        {placed.trackPath && (
          <p className={styles.whatsappHint}>
            {t.myOrdersHint} <a href="/orders">{t.myOrders}</a>
          </p>
        )}
        <p>{t.payOnDelivery}</p>
        {placed.whatsapp && (
          <>
            <a className={styles.whatsapp} href={placed.whatsapp.url} target="_blank" rel="noopener noreferrer">
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
      {pending[0] && (
        <div id="pending-confirm">
          <PendingConfirm
            order={pending[0]}
            lang={lang}
            t={t}
            onAnswered={() => {
              setError(null);
              reloadPending();
            }}
          />
        </div>
      )}
      {me && (
        <div className={styles.welcome}>
          <p>{fill(t.welcomeBack, { name: me.name })}</p>
          {!me.address && <p className={styles.addressNeeded}>{t.addAddressOnce}</p>}
          {last.length > 0 && (
            <button
              type="button"
              className={styles.again}
              onClick={() => setQuantities(Object.fromEntries(last.map((l) => [l.dish.id, l.quantity])))}
            >
              <Icon name="repeat" /> {t.sameAsLast}: {last.map((l) => `${l.quantity} × ${l.dish.name}`).join(", ")}
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
        <label>
          {t.address}
          <span className={styles.withMic}>
            <textarea name="address" rows={2} autoComplete="street-address" required minLength={5} maxLength={300} defaultValue={me?.address} />
            <MicButton lang={lang} t={mic} />
          </span>
        </label>
        {me && (
          <button type="button" className={styles.forget} onClick={forget}>
            {t.forgetMe}
          </button>
        )}
        <label>
          {t.note}
          <span className={styles.withMic}>
            <textarea name="note" rows={2} maxLength={500} />
            <MicButton lang={lang} t={mic} />
          </span>
          <small className={styles.micHint}>{t.micHint}</small>
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
