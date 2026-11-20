import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { fill, getDictionary, LANG_COOKIE, pickLanguage } from "@/lib/i18n";
import { listKitchens } from "@/lib/menu";
import { formatTime } from "@/lib/time";
import LanguageSwitch from "./[slug]/LanguageSwitch";
import MyOrdersLink from "../orders/MyOrdersLink";
import styles from "./kitchens.module.css";

// The customer's list of kitchens. Read from the database on every request, like the menu page.
export default function KitchensPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.empty}>…</p>}>
        <Kitchens />
      </Suspense>
    </main>
  );
}

async function Kitchens() {
  // Render only at request time. Without this, Next.js tries to pre-render the page ahead of time (it can
  // even read cookies then), and the database driver's internal Date.now() stops it with an error.
  await connection();
  const lang = pickLanguage((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"));
  const t = getDictionary(lang);
  const kitchens = await listKitchens(lang);

  return (
    <div lang={lang}>
      <div className={styles.topRow}>
        <MyOrdersLink label={t.myOrders} className={styles.myOrders} />
        <LanguageSwitch current={lang} />
      </div>
      <header className={styles.header}>
        <h1>{t.kitchensTitle}</h1>
        <p>{t.kitchensLead}</p>
      </header>

      {kitchens.length === 0 && <p className={styles.empty}>{t.noKitchens}</p>}

      <ul className={styles.list}>
        {kitchens.map((k) => {
          const status =
            k.state === "open" && k.cutoffTime
              ? fill(t.openUntil, { time: formatTime(k.cutoffTime) })
              : { open: t.menuNotUp, closed: t.closedToday, holiday: t.holidayToday, none: t.menuNotUp }[k.state];
          return (
            <li key={k.slug}>
              <Link href={`/k/${k.slug}`} className={k.state === "open" ? styles.card : styles.cardMuted}>
                <span className={styles.top}>
                  <strong className={styles.name}>{k.name}</strong>
                  {k.lowestPrice != null && <span className={styles.price}>{fill(t.from, { price: k.lowestPrice })}</span>}
                </span>
                <span className={styles.area}>{k.deliveryArea}</span>
                {k.dishes.length > 0 && <span className={styles.dishes}>{k.dishes.join(", ")}</span>}
                <span className={k.state === "open" ? styles.open : styles.closed}>{status}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
