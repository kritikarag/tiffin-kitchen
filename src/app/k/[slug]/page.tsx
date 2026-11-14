import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { fill, getDictionary, LANG_COOKIE, pickLanguage } from "@/lib/i18n";
import { getTodayMenu } from "@/lib/menu";
import { formatTime } from "@/lib/time";
import LanguageSwitch from "./LanguageSwitch";
import OrderForm from "./OrderForm";
import styles from "./menu.module.css";

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
      <LanguageSwitch current={lang} />
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
