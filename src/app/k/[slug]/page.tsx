import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { fill, getDictionary, LANG_COOKIE, pickLanguage } from "@/lib/i18n";
import { getTodayMenu } from "@/lib/menu";
import { formatTime } from "@/lib/time";
import LanguageSwitch from "./LanguageSwitch";
import OrderForm from "./OrderForm";
import MyOrdersLink from "../../orders/MyOrdersLink";
import styles from "./menu.module.css";
import Icon from "@/components/Icon";

type Props = { params: Promise<{ slug: string }> };

// The menu is read from the database on every request, so it sits inside Suspense and is never cached.
export default function KitchenPage({ params }: Props) {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.loading}>…</p>}>
        <Menu params={params} />
      </Suspense>
    </main>
  );
}

async function Menu({ params }: Props) {
  // Render only at request time. Without this, Next.js tries to pre-render the page ahead of time (it can
  // even read cookies then), and the database driver's internal Date.now() stops it with an error.
  await connection();
  const { slug } = await params;
  const lang = pickLanguage((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"));
  const t = getDictionary(lang);
  const menu = await getTodayMenu(slug, lang);

  if (!menu) {
    return (
      <>
        <LanguageSwitch current={lang} />
        <p className={styles.notice}>{t.notFound}</p>
      </>
    );
  }

  const notice = { holiday: t.holiday, closed: t.closed, none: t.noMenu, open: null }[menu.state];

  return (
    <div lang={lang}>
      <div className={styles.topRow}>
        <Link href="/k" className={styles.back}>
          <Icon name="chevronLeft" /> {t.allKitchens}
        </Link>
        <MyOrdersLink label={t.myOrders} className={styles.back} />
        <LanguageSwitch current={lang} />
      </div>
      <header className={styles.header}>
        <h1>{menu.kitchen.name}</h1>
        {menu.kitchen.deliveryArea && <p>{fill(t.deliversTo, { area: menu.kitchen.deliveryArea })}</p>}
      </header>

      {notice && <p className={styles.notice}>{notice}</p>}

      {menu.state === "open" && (
        <>
          <div className={styles.menuHead}>
            <h2>{t.todaysMenu}</h2>
            {menu.cutoffTime && (
              <span className={styles.cutoff}>{fill(t.orderBy, { time: formatTime(menu.cutoffTime) })}</span>
            )}
          </div>
          <OrderForm slug={slug} lang={lang} t={t} dishes={menu.dishes} />
        </>
      )}

      {menu.state === "closed" && menu.dishes.length > 0 && (
        <ul className={styles.dishes}>
          {menu.dishes.map((dish) => (
            <li key={dish.id} className={styles.dish}>
              <div className={styles.dishText}>
                <strong>{dish.name}</strong>
                {dish.description && <span>{dish.description}</span>}
              </div>
              <span className={styles.price}>₹{dish.price}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
