"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { getDictionary, isLang, LANG_COOKIE, LANGUAGES, type Lang } from "@/lib/i18n";
import MyOrdersLink from "./orders/MyOrdersLink";
import { homeCopy, NOTE_EXAMPLE, ONE_DISH, PRIYA, TICKETS, TOOL_GROUPS, type HomeCopy } from "./homeCopy";
import styles from "./home.module.css";
import { VERSION } from "@/lib/version";
import Icon from "@/components/Icon";

const DEMO_OWNER = "/owner?t=11a6b5e1-d4e1-4000-8000-000000000001";
const DEMO_KITCHEN = "/k/lakshmi-tiffins";
const CONTACT_EMAIL = "hello@tiffin.kitchen"; // GoDaddy Professional Email on the project's own domain

// The page is pre-rendered in English; in the browser it opens in the language saved in the cookie.
const noSubscribe = () => () => {};
function savedLang(): Lang | null {
  const value = document.cookie.match(new RegExp(`(?:^|; )${LANG_COOKIE}=([^;]*)`))?.[1];
  return isLang(value) ? value : null;
}
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Home() {
  const saved = useSyncExternalStore(noSubscribe, savedLang, () => null);
  const [chosen, setLang] = useState<Lang | null>(null);
  const lang: Lang = chosen ?? saved ?? "en";
  const t = homeCopy(lang);

  // The choice is saved in the same cookie the kitchen pages use, so they open in it too.
  function choose(code: Lang) {
    setLang(code);
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className={styles.page} lang={lang}>
      <header className={styles.bar}>
        <a href="#top" className={styles.brand}>
          Tiffin
        </a>
        <nav className={styles.nav} aria-label="Sections">
          <a href="#day">{t.nav.day}</a>
          <a href="#customer">{t.nav.customer}</a>
          <a href="#agent">{t.nav.agent}</a>
          <a href="#languages">{t.nav.languages}</a>
          <a href="#trust">{t.nav.trust}</a>
        </nav>
        <MyOrdersLink label={getDictionary(lang).myOrders} className={styles.myOrders} />
        <label className={styles.langPick}>
          <Icon name="globe" />
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

      <main id="top">
        <Hero t={t} lang={lang} />
        <Day id="day" title={t.dayTitle} lead={t.dayLead} moments={t.moments} screen={(i) => <Screen t={t} which={i} />} />
        <Day
          id="customer"
          customer
          title={t.customerTitle}
          lead={t.customerLead}
          moments={t.customerMoments}
          screen={(i) => <CustomerScreen t={t} which={i} />}
        />
        <Agent t={t} />
        <Languages t={t} lang={lang} choose={choose} />
        <Trust t={t} />
        <Compare t={t} />

        <section className={styles.cta}>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
          <div className={styles.actions}>
            <Link href={DEMO_OWNER} className={styles.primaryLight}>
              <Icon name="mic" /> {t.ctaCook}
            </Link>
            <Link href={DEMO_KITCHEN} className={styles.secondaryLight}>
              {t.ctaCustomer}
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        {t.footer}{" "}
        <span className={styles.contact}>
          {t.contact} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </span>
        <span className={styles.version}>Version: {VERSION}</span>
      </footer>

      <Link href={DEMO_OWNER} className={styles.floating}>
        <Icon name="play" /> {t.nav.demo}
      </Link>
    </div>
  );
}

function Hero({ t, lang }: { t: HomeCopy; lang: Lang }) {
  return (
    <section className={styles.hero}>
      <div>
        <h1 key={`h-${lang}`} className={styles.title}>
          {t.title}
        </h1>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.actions}>
          <Link href="/owner" className={styles.primary}>
            <Icon name="mic" /> {t.start}
          </Link>
          <Link href="/k" className={styles.secondary}>
            {t.demo}
          </Link>
        </div>
        <dl className={styles.stats}>
          {t.stats.map(([number, label]) => (
            <div key={label}>
              <dt>{number}</dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* A steel tiffin carrier holding today's dishes, with orders arriving around it in three scripts. */}
      <div className={styles.carrierStage} aria-hidden="true">
        <div className={styles.carrier}>
          <div className={styles.handle} />
          <div className={styles.lid} />
          {t.tiers.map((dish, i) => (
            <div key={`${lang}-${i}`} className={styles.tier} style={{ animationDelay: `${i * 90}ms` }}>
              <span>{dish}</span>
            </div>
          ))}
        </div>
        {TICKETS.map((ticket, i) => (
          <div key={i} className={`${styles.ticket} ${styles[`ticket${i}`]}`} style={{ animationDelay: `${600 + i * 700}ms` }}>
            <span className={styles.ticketHead}>
              <Icon name="bell" /> {t.newOrder} · {ticket.who}
            </span>
            <span>{ticket.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// "One day in Lakshmi's kitchen": five moments to tap through. It plays by itself until the visitor taps
// one, and never plays for visitors who prefer reduced motion.
type DayProps = {
  id: string;
  title: string;
  lead: string;
  moments: string[][];
  screen: (which: number) => ReactNode;
  customer?: boolean;
};

// A day told in moments: tap one to see the phone at that moment. Used for the cook's day and her customer's.
function Day({ id, title, lead, moments, screen, customer }: DayProps) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing || reducedMotion()) return;
    const timer = setInterval(() => setActive((a) => (a + 1) % moments.length), 4500);
    return () => clearInterval(timer);
  }, [playing, moments.length]);

  const pick = (i: number) => {
    setPlaying(false);
    setActive(i);
  };

  return (
    <section id={id} className={customer ? styles.dayCustomer : styles.day}>
      <div className={styles.inner}>
        <h2>{title}</h2>
        <p className={styles.dayLead}>{lead}</p>
        <div className={styles.dayGrid}>
          <ol className={styles.moments}>
            {moments.map(([time, heading, text], i) => (
              <li key={i}>
                <button type="button" className={i === active ? styles.momentOn : styles.moment} onClick={() => pick(i)} aria-pressed={i === active}>
                  <span className={styles.time}>{time}</span>
                  <strong>{heading}</strong>
                  {i === active && <span className={styles.momentText}>{text}</span>}
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.screen} aria-live="polite" key={active}>
            {screen(active)}
          </div>
        </div>
      </div>
    </section>
  );
}

// Priya's phone at each moment of her day, in Hindi, drawn with the real app's pieces.
function CustomerScreen({ t, which }: { t: HomeCopy; which: number }) {
  switch (which) {
    case 0:
      return (
        <div lang="hi" className={styles.phoneStack}>
          <strong className={styles.phoneTitle}>लक्ष्मी टिफ़िन्स</strong>
          {PRIYA.dishes.map(([dish, price]) => (
            <div key={dish} className={styles.menuRow}>
              <span>{dish}</span>
              <span>{price}</span>
            </div>
          ))}
          <div className={styles.dishRow}>
            <span>{PRIYA.soldOutDish}</span>
            <span className={styles.soldOut}>{PRIYA.soldOut}</span>
          </div>
        </div>
      );
    case 1:
      return (
        <>
          <p className={styles.said} lang="hi">
            <Icon name="mic" /> {PRIYA.said}
          </p>
          <div className={styles.alert}>
            <strong>
              <Icon name="alert" /> {t.c2Note}
            </strong>
            <span lang="kn">{PRIYA.noteKn}</span>
          </div>
        </>
      );
    case 2:
      return (
        <div className={styles.payCard}>
          <span>{t.c3Pay}</span>
          <svg className={styles.qr} viewBox="0 0 21 21" aria-hidden="true">
            {QR_CELLS.map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
            ))}
          </svg>
          <strong>{PRIYA.amount}</strong>
          <span className={styles.paid}>
            <Icon name="rupee" /> {t.c3Direct}
          </span>
        </div>
      );
    case 3:
      return (
        <>
          <ol className={styles.miniStages} lang="hi">
            {PRIYA.stages.map((stage, i) => (
              <li key={stage} className={i < 2 ? styles.stageDone : i === 2 ? styles.stageNow : styles.stageNext}>
                <Icon name={(["receipt", "flame", "bike", "check"] as const)[i]} /> {stage}
              </li>
            ))}
          </ol>
          <p className={styles.whatsappBubble} lang="hi">
            {PRIYA.whatsapp}
          </p>
        </>
      );
    case 4:
      return (
        <>
          <span className={styles.receivedButton} lang="hi">
            <Icon name="check" /> {PRIYA.received}
          </span>
          <span className={styles.cookHeading}>{t.c5Chime}</span>
          <div className={styles.banner}>
            <Icon name="delivered" /> <strong>{t.c5Received}</strong>
          </div>
        </>
      );
    default:
      return (
        <div lang="hi" className={styles.phoneStack}>
          <span className={styles.againButton}>
            <Icon name="repeat" /> {PRIYA.same}: {PRIYA.sameItems}
          </span>
          <span className={styles.receivedButton}>{PRIYA.placeOrder}</span>
        </div>
      );
  }
}

// A QR-like drawing for the payment moment (not a real code): finder squares in three corners, cells between.
const QR_CELLS: [number, number][] = (() => {
  const cells: [number, number][] = [];
  const finder = (ox: number, oy: number) => {
    for (let x = 0; x < 7; x++)
      for (let y = 0; y < 7; y++) if (x === 0 || y === 0 || x === 6 || y === 6 || (x > 1 && x < 5 && y > 1 && y < 5)) cells.push([ox + x, oy + y]);
  };
  finder(0, 0);
  finder(14, 0);
  finder(0, 14);
  // About half the remaining cells filled, from a fixed seed, so it looks like a real code on every render.
  let seed = 7;
  for (let x = 0; x < 21; x++)
    for (let y = 0; y < 21; y++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
      if (!inFinder && seed % 100 < 48) cells.push([x, y]);
    }
  return cells;
})();

// What her phone (or her customer's) shows at each moment, drawn with the real app's pieces.
function Screen({ t, which }: { t: HomeCopy; which: number }) {
  const steps = (icon: "done" | "wait", text: string, tag = "Database") => (
    <div className={styles.did}>
      <span className={styles.didHeading}>{t.stepsHeading}</span>
      <p>
        <span className={icon === "done" ? styles.tick : styles.wait} aria-hidden="true">
          <Icon name={icon === "done" ? "check" : "clock"} />
        </span>
        <span>
          {text}
          {icon === "wait" && <em> · {t.waiting}</em>}
        </span>
        <span className={styles.tag}>{tag}</span>
      </p>
    </div>
  );
  switch (which) {
    case 0:
      return (
        <>
          <p className={styles.said}><Icon name="mic" /> {t.m1Said}</p>
          {steps("wait", t.m1Step)}
          <p className={styles.reply}>{t.m1Reply}</p>
          <div className={styles.yesNo} aria-hidden="true">
            <span className={styles.yes}><Icon name="check" /> {t.yes}</span>
            <span className={styles.no}><Icon name="x" /> {t.no}</span>
          </div>
        </>
      );
    case 1:
      return (
        <>
          <div className={styles.banner}>
            <Icon name="bell" /> <strong>{t.newOrder}</strong> · {t.m2Who}
          </div>
          <div className={styles.orderCard}>
            <strong>{t.m2Who}</strong>
            <span>{t.m2Items}</span>
            <span className={styles.paid}><Icon name="delivered" /> {t.m2Paid}</span>
          </div>
          <div className={styles.orderCard}>
            <strong>{TICKETS[0].who}</strong>
            <span lang="hi">{TICKETS[0].text}</span>
          </div>
        </>
      );
    case 2:
      return (
        <>
          <p className={styles.said}><Icon name="mic" /> {t.m3Said}</p>
          {steps("done", t.m3Step)}
          <div className={styles.dishRow}>
            <span>{t.m3Dish}</span>
            <span className={styles.soldOut}>{t.m3SoldOut}</span>
          </div>
        </>
      );
    case 3:
      return (
        <>
          <div className={styles.alert}>
            <strong><Icon name="alert" /> {t.m4Alert}</strong>
            {t.m4AlertText}
          </div>
          <span className={styles.cookHeading}>{t.m4Cook}</span>
          {t.m4Totals.map(([n, dish]) => (
            <div key={dish} className={styles.cookRow}>
              <span className={styles.cookQty}>{n}</span>
              {dish}
            </div>
          ))}
        </>
      );
    default:
      return (
        <>
          <p className={styles.said}><Icon name="mic" /> {t.m5Said}</p>
          {steps("done", t.m5Step)}
          <div className={styles.dabbaCount}>
            <strong><Icon name="box" /> 12</strong> {t.m5Out}
          </div>
        </>
      );
  }
}

function Agent({ t }: { t: HomeCopy }) {
  return (
    <section id="agent" className={styles.agent}>
      <div className={styles.inner}>
        <h2>{t.agentTitle}</h2>
        <p className={styles.sectionLead}>{t.agentLead}</p>
        <ol className={styles.flow}>
          {t.flow.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <p className={styles.flowNote}>{t.flowNote}</p>
        <div className={styles.toolGroups}>
          {TOOL_GROUPS.map((tools, i) => (
            <div key={i}>
              <span className={styles.groupName}>{t.groups[i]}</span>
              <ul>
                {tools.map((tool) => (
                  <li key={tool}>
                    <code>{tool}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <ul className={styles.outcomes}>
          {t.outcomes.map(([title, text]) => (
            <li key={title}>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Languages({ t, lang, choose }: { t: HomeCopy; lang: Lang; choose: (l: Lang) => void }) {
  return (
    <section id="languages" className={styles.languages}>
      <div className={styles.inner}>
        <h2>{t.langTitle}</h2>
        <p className={styles.sectionLead}>{t.langText}</p>
        <ul className={styles.scripts}>
          {LANGUAGES.map((l) => (
            <li key={l.code} lang={l.code}>
              <button type="button" className={l.code === lang ? styles.scriptOn : styles.script} onClick={() => choose(l.code)} aria-pressed={l.code === lang}>
                <span className={styles.scriptDish}>{ONE_DISH[l.code]}</span>
                <span className={styles.scriptName}>{l.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={styles.notePair}>
          <div>
            <span>{t.noteFrom}</span>
            <p lang="ta">“{NOTE_EXAMPLE.written}”</p>
          </div>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <div>
            <span>{t.noteTo}</span>
            <p lang="kn">“{NOTE_EXAMPLE.read}”</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Trust({ t }: { t: HomeCopy }) {
  const icons = ["hand", "eye", "hash", "shield", "alert", "rupee"] as const;
  return (
    <section id="trust" className={styles.trust}>
      <div className={styles.inner}>
        <h2>{t.trustTitle}</h2>
        <ul className={styles.guards}>
          {t.trust.map(([title, text], i) => (
            <li key={i}>
              <span className={styles.guardIcon} aria-hidden="true">
                <Icon name={icons[i]} />
              </span>
              <strong>{title}</strong>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Compare({ t }: { t: HomeCopy }) {
  return (
    <section className={styles.compare}>
      <div className={styles.without}>
        <h3>{t.withoutTitle}</h3>
        <ul>
          {t.without.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className={styles.with}>
        <h3>{t.withTitle}</h3>
        <ul>
          {t.with.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
