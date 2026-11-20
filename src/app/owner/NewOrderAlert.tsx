"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerOrder } from "@/lib/ownerOrders";
import styles from "./owner.module.css";

// While the owner page is open, checks for new orders every 20 seconds and shows a banner with a short
// chime, so she hears about an order without opening the orders screen. The first check only records
// what is already there; only orders that arrive after it are announced.

const EVERY_MS = 20_000;

function chime() {
  try {
    const audio = new AudioContext();
    [880, 1175].forEach((frequency, i) => {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.frequency.value = frequency;
      const start = audio.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      tone.connect(gain).connect(audio.destination);
      tone.start(start);
      tone.stop(start + 0.4);
    });
    setTimeout(() => audio.close(), 1000);
  } catch {
    // No sound (blocked until the page has been tapped, or not supported): the banner still shows.
  }
}

type Props = {
  getToken: () => string | null;
  lang: string;
  t: Record<string, string>;
  onOpenOrders: () => void;
};

export default function NewOrderAlert({
  getToken,
  lang,
  t,
  onOpenOrders,
}: Props) {
  const [fresh, setFresh] = useState<OwnerOrder[]>([]);
  const [received, setReceived] = useState<OwnerOrder[]>([]);
  const [missing, setMissing] = useState<OwnerOrder[]>([]);
  const seen = useRef<{
    token: string;
    lastId: number;
    received: Set<number>;
    missing: Set<number>;
  } | null>(null);

  useEffect(() => {
    let stopped = false;
    async function check() {
      const token = getToken();
      if (!token || document.hidden) return;
      try {
        const response = await fetch(
          `/api/owner/orders?token=${encodeURIComponent(token)}&lang=${lang}&notes=0`,
          { cache: "no-store" },
        );
        const { kitchen } = await response.json();
        if (stopped || !kitchen) return;
        const placed: OwnerOrder[] = kitchen.orders.filter(
          (o: OwnerOrder) => o.status === "placed",
        );
        const lastId = Math.max(0, ...placed.map((o) => o.id));
        // A different conversation (Start over, or another kitchen): start counting again.
        const confirmed = placed.filter(
          (o) => o.delivery === "delivered" && o.deliveredBy === "customer",
        );
        if (!seen.current || seen.current.token !== token) {
          seen.current = {
            token,
            lastId,
            received: new Set(confirmed.map((o) => o.id)),
            missing: new Set(placed.filter((o) => o.notReceived).map((o) => o.id)),
          };
          return;
        }
        // Customers who just said their tiffin didn't arrive.
        const justMissing = placed.filter((o) => o.notReceived && !seen.current!.missing.has(o.id));
        if (justMissing.length) {
          justMissing.forEach((o) => seen.current!.missing.add(o.id));
          setMissing((m) => [...m, ...justMissing]);
          chime();
        }
        // Customers who just tapped "I've received my tiffin".
        const justReceived = confirmed.filter(
          (o) => !seen.current!.received.has(o.id),
        );
        if (justReceived.length) {
          justReceived.forEach((o) => seen.current!.received.add(o.id));
          setReceived((r) => [...r, ...justReceived]);
          chime();
        }
        const newer = placed.filter((o) => o.id > seen.current!.lastId);
        if (newer.length) {
          seen.current.lastId = lastId;
          setFresh((f) => [...f, ...newer]);
          chime();
        }
      } catch {
        // Offline for a moment: try again on the next tick.
      }
    }
    // The first check waits a moment: the page restores its conversation token in an effect that runs
    // after this one.
    const first = setTimeout(check, 1500);
    const timer = setInterval(check, EVERY_MS);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [getToken, lang]);

  const lastReceived = received[received.length - 1];
  const receivedBanner = lastReceived && (
    <div className={styles.receivedBanner} role="status">
      <span aria-hidden="true">✅</span>
      <strong>
        {t.receivedAlert.replace("{name}", lastReceived.customerName)}
        {received.length > 1 ? ` (+${received.length - 1})` : ""}
      </strong>
      <button
        type="button"
        className={styles.newOrderClose}
        onClick={() => setReceived([])}
        aria-label={t.dismiss}
      >
        ✕
      </button>
    </div>
  );
  const lastMissing = missing[missing.length - 1];
  const missingBanner = lastMissing && (
    <div className={styles.missingBanner} role="alert">
      <span aria-hidden="true">⚠️</span>
      <strong>
        {t.missingAlert.replace("{name}", lastMissing.customerName)} · <a href={`tel:+91${lastMissing.phone}`}>📞 {lastMissing.phone}</a>
      </strong>
      <button type="button" className={styles.newOrderClose} onClick={() => setMissing([])} aria-label={t.dismiss}>
        ✕
      </button>
    </div>
  );
  if (fresh.length === 0) return missingBanner || receivedBanner ? <>{missingBanner}{receivedBanner}</> : null;
  const latest = fresh[fresh.length - 1];
  return (
    <>
      {missingBanner}
      {receivedBanner}
      <div className={styles.newOrder} role="status">
        <span className={styles.newOrderIcon} aria-hidden="true">
          🔔
        </span>
        <div className={styles.newOrderText}>
          <strong>
            {t.newOrder}
            {fresh.length > 1 ? ` (${fresh.length})` : ""}:{" "}
            {latest.customerName} · ₹{latest.amount}
          </strong>
          <span>
            {latest.items.map((i) => `${i.quantity} × ${i.dish}`).join(", ")} ·{" "}
            {latest.area}
          </span>
        </div>
        <div className={styles.newOrderActions}>
          <button
            type="button"
            onClick={() => {
              setFresh([]);
              onOpenOrders();
            }}
          >
            {t.seeOrders}
          </button>
          <button
            type="button"
            className={styles.newOrderClose}
            onClick={() => setFresh([])}
            aria-label={t.dismiss}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
