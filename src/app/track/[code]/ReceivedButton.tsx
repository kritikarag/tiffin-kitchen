"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./track.module.css";

type Props = { code: string; notReceived: boolean; t: { yes: string; no: string; hint: string; thanks: string; noDone: string } };

// Only the customer can say the food arrived. "It didn't arrive" tells the cook in red so she can call;
// the order stays open, so they can still confirm if it comes later.
export default function ReceivedButton({ code, notReceived, t }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "yes" | "no" | "failed">(notReceived ? "no" : "idle");

  async function answer(arrived: boolean) {
    setState("sending");
    try {
      const response = await fetch("/api/track/received", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, arrived }),
      });
      if (!response.ok) throw new Error();
      setState(arrived ? "yes" : "no");
      router.refresh();
    } catch {
      setState("failed");
    }
  }

  if (state === "yes") return <p className={styles.thanks}>✓ {t.thanks}</p>;
  return (
    <div className={styles.received}>
      {state === "no" && <p className={styles.reported}>{t.noDone}</p>}
      <button type="button" onClick={() => answer(true)} disabled={state === "sending"}>
        ✓ {t.yes}
      </button>
      {state !== "no" && (
        <>
          <p>{t.hint}</p>
          <button type="button" className={styles.notArrived} onClick={() => answer(false)} disabled={state === "sending"}>
            {t.no}
          </button>
        </>
      )}
    </div>
  );
}
