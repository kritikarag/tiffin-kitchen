"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { isLang, LANG_COOKIE, LANGUAGES, type Lang } from "@/lib/i18n";
import { homeCopy, ONE_DISH } from "./homeCopy";
import styles from "./home.module.css";

// The whole page switches language, so the first thing a visitor sees is the product's main idea.
// The choice is saved in the same cookie the kitchen pages use, so "Browse kitchens" opens in it too.
// The page is pre-rendered in English; in the browser it opens in the language saved in the cookie.
const noSubscribe = () => () => {};
function savedLang(): Lang | null {
  const value = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1];
  return isLang(value) ? value : null;
}

export default function Home() {
  const saved = useSyncExternalStore(noSubscribe, savedLang, () => null);
  const [chosen, setLang] = useState<Lang | null>(null);
  const lang: Lang = chosen ?? saved ?? "en";
  const t = homeCopy(lang);

  function choose(code: Lang) {
    setLang(code);
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className={styles.page} lang={lang}>
      <header className={styles.bar}>
        <span className={styles.brand}>Tiffin</span>
        <label className={styles.langPick}>
          <span aria-hidden="true">🌐</span>
          <span className={styles.hidden}>{t.langLabel}</span>
          <select value={lang} onChange={(e) => choose(e.target.value as Lang)}>
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} lang={l.code}>
                {l.label}
                {l.code === "en" ? "" : ` · ${l.name}`}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <h1 key={`h-${lang}`} className={styles.title}>
              {t.title}
            </h1>
            <p className={styles.lead}>{t.lead}</p>
            <div className={styles.actions}>
              <Link href="/owner" className={styles.primary}>
                <span aria-hidden="true">🎤</span> {t.start}
              </Link>
              <Link href="/k" className={styles.secondary}>
                {t.demo}
              </Link>
            </div>
          </div>

          {/* A steel tiffin carrier: three tiers, each holding one of today's dishes. */}
          <div className={styles.carrier} aria-hidden="true">
            <div className={styles.handle} />
            <div className={styles.lid} />
            {t.tiers.map((dish, i) => (
              <div key={`${lang}-${i}`} className={styles.tier} style={{ animationDelay: `${i * 90}ms` }}>
                <span>{dish}</span>
              </div>
            ))}
          </div>
        </section>

        {/* The assistant at work, drawn with the same pieces as the real owner page. */}
        <section className={styles.talk}>
          <div className={styles.talkText}>
            <h2>{t.chatTitle}</h2>
            <p>{t.chatLead}</p>
          </div>
          <div className={styles.phone} aria-label={t.chatTitle}>
            <p className={styles.said}>{t.chatOwner1}</p>
            <div className={styles.did}>
              <span className={styles.didHeading}>{t.stepsHeading}</span>
              <p>
                <span className={styles.tick} aria-hidden="true">✓</span>
                <span>{t.chatStep1}</span>
                <span className={styles.tag}>Database</span>
              </p>
            </div>
            <p className={styles.reply}>{t.chatReply1}</p>

            <p className={styles.said}>{t.chatOwner2}</p>
            <div className={styles.did}>
              <span className={styles.didHeading}>{t.stepsHeading}</span>
              <p>
                <span className={styles.wait} aria-hidden="true">⏳</span>
                <span>
                  {t.chatStep2} <em>· {t.chatWaiting}</em>
                </span>
                <span className={styles.tag}>Database</span>
              </p>
            </div>
            <p className={styles.reply}>{t.chatReply2}</p>
            <div className={styles.yesNo} aria-hidden="true">
              <span className={styles.yes}>✓ {t.yes}</span>
              <span className={styles.no}>✕ {t.no}</span>
            </div>
          </div>
        </section>

        <section className={styles.day}>
          <h2>{t.dayTitle}</h2>
          <ol className={styles.steps}>
            {t.day.map(([when, what], i) => (
              <li key={i}>
                <strong>{when}</strong>
                <p>{what}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.languages}>
          <h2>{t.langTitle}</h2>
          <p className={styles.languagesText}>{t.langText}</p>
          <ul className={styles.scripts}>
            {LANGUAGES.map((l) => (
              <li key={l.code} lang={l.code} className={l.code === lang ? styles.scriptOn : undefined}>
                <span className={styles.scriptDish}>{ONE_DISH[l.code]}</span>
                <span className={styles.scriptName}>{l.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.trust}>
          <h2>{t.trustTitle}</h2>
          <dl>
            {t.trust.map(([title, text], i) => (
              <div key={i}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className={styles.footer}>{t.footer}</footer>
    </div>
  );
}
