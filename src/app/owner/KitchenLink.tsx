"use client";

import { useEffect, useRef, useState } from "react";
import type { OwnerLabels } from "./labels";
import styles from "./owner.module.css";
import Icon from "@/components/Icon";

// Her private kitchen link. Until owners sign in with a phone number, this link is how she gets back to her
// kitchen on any phone or computer, so the page offers it as soon as she has a kitchen: copy it, or send it to
// her own WhatsApp where she will always find it. It works like a key, so it is only ever shown to her.

type Kitchen = { name: string; whatsapp: string | null; token: string };

export default function KitchenLink({ getToken, t, refreshKey }: { getToken: () => string | null; t: OwnerLabels; refreshKey: number }) {
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isNew, setIsNew] = useState(false);
  // True once a check found no kitchen. If a later check finds one, she has just created it: open the
  // link card by itself, so she sees and saves her link without having to look for it.
  const hadNone = useRef(false);
  const card = useRef<HTMLDivElement>(null);

  // A new kitchen's link card scrolls into view, since the chat she is reading is further down the page.
  useEffect(() => {
    if (isNew) card.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isNew]);

  // Checked again after each reply, because the kitchen appears the moment she says Yes to saving it.
  // The first check waits a moment: the page restores its token in an effect that runs after this one.
  useEffect(() => {
    let live = true;
    const check = setTimeout(() => {
      const token = getToken();
      if (!token) {
        hadNone.current = true;
        return live && setKitchen(null);
      }
      fetch(`/api/owner/kitchen?token=${encodeURIComponent(token)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!live) return;
          if (!d.kitchen) {
            hadNone.current = true;
            return setKitchen(null);
          }
          if (hadNone.current) {
            hadNone.current = false;
            setOpen(true);
            setIsNew(true);
          }
          setKitchen({ ...d.kitchen, token });
        })
        .catch(() => {});
    }, 600);
    return () => {
      live = false;
      clearTimeout(check);
    };
  }, [getToken, refreshKey]);

  if (!kitchen) return null;
  const link = `${window.location.origin}/owner?t=${kitchen.token}`;
  const message = `${t.linkMessage.replace("{name}", kitchen.name)}\n${link}`;
  const whatsapp = kitchen.whatsapp
    ? `https://wa.me/${kitchen.whatsapp}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is shown on screen to copy by hand.
    }
  }

  return (
    <>
      <button type="button" className={styles.keyButton} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="key" /> {t.myLink}
      </button>
      {open && (
        <div ref={card} className={isNew ? styles.keyCardNew : styles.keyCard}>
          {isNew && <p className={styles.keyNew}>{t.linkNew}</p>}
          <strong>{t.linkTitle.replace("{name}", kitchen.name)}</strong>
          <p>{t.linkHelp}</p>
          <code className={styles.keyLink}>{link}</code>
          <div className={styles.keyActions}>
            <a className={styles.keyWhatsapp} href={whatsapp} target="_blank" rel="noopener noreferrer">
              {t.sendSelf}
            </a>
            <button type="button" onClick={copy}>
              {copied ? <><Icon name="check" /> {t.copied}</> : t.copyLink}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
