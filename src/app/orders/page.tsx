import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { getDictionary, LANG_COOKIE, pickLanguage } from "@/lib/i18n";
import LanguageSwitch from "../k/[slug]/LanguageSwitch";
import MyOrders from "./MyOrders";
import styles from "./orders.module.css";
import Icon from "@/components/Icon";

// "My orders": every order placed on this phone, current ones first. The list of orders lives on the phone
// (see remember.ts), so there is no account and nothing to sign in to.
export const metadata: Metadata = { title: "My orders · Tiffin", robots: { index: false } };

export default function OrdersPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p>…</p>}>
        <Orders />
      </Suspense>
    </main>
  );
}

async function Orders() {
  await connection();
  const lang = pickLanguage((await cookies()).get(LANG_COOKIE)?.value, (await headers()).get("accept-language"));
  const t = getDictionary(lang);
  return (
    <div lang={lang}>
      <div className={styles.topRow}>
        <Link href="/k" className={styles.back}>
          <Icon name="chevronLeft" /> {t.allKitchens}
        </Link>
        <LanguageSwitch current={lang} />
      </div>
      <h1>{t.myOrders}</h1>
      <MyOrders lang={lang} t={t} />
    </div>
  );
}
