"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./track.module.css";

// "I've received my tiffin": the customer, not the cook, says when the food arrived. The cook's screen
// announces it within 20 seconds.
export default function ReceivedButton({ code, label, hint, thanks }: { code: string; label: string; hint: string; thanks: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "done" | "failed">("idle");

  async function confirm() {
    setState("sending");
    try {
      const response = await fetch("/api/track/received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) throw new Error();
      setState("done");
      router.refresh();
    } catch {
      setState("failed");
    }
  }

  if (state === "done") return <p className={styles.thanks}>✓ {thanks}</p>;
  return (
    <div className={styles.received}>
      <button type="button" onClick={confirm} disabled={state === "sending"}>
        ✓ {label}
      </button>
      <p>{hint}</p>
    </div>
  );
}
