"use client";

import { useEffect } from "react";
import { rememberOrder } from "@/app/k/[slug]/remember";

// Opening a tracking link (from the order screen or the cook's WhatsApp message) keeps the order in
// "My orders" on this phone.
export default function RememberOrder({ code }: { code: string }) {
  useEffect(() => rememberOrder(code), [code]);
  return null;
}
