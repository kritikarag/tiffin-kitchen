"use client";

import { useSyncExternalStore } from "react";
import { parse, readOrders, subscribe } from "../k/[slug]/remember";

// A link to "My orders", shown only on a phone that has placed an order.
export default function MyOrdersLink({ label, className }: { label: string; className?: string }) {
  const raw = useSyncExternalStore(subscribe, readOrders, () => null);
  const count = parse<string[]>(raw)?.length ?? 0;
  if (count === 0) return null;
  return (
    <a href="/orders" className={className}>
      🧾 {label}
    </a>
  );
}
