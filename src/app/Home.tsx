"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./home.module.css";

type Lang = "kn" | "hi" | "en";

// The whole page switches language, so the first thing a visitor sees is the product's main idea.
const COPY: Record<Lang, {
  title: string;
  lead: string;
  start: string;
  demo: string;
  tiers: [string, string, string];
  dayTitle: string;
  day: [string, string][];
  forCustomers: string;
  customersText: string;
  trust: string;
  trustText: string;
}> = {
  kn: {
    title: "ನಿಮ್ಮ ಅಡುಗೆಮನೆ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.",
    lead: "ನೀವು ಮಾತನಾಡಿ. ಮೆನು, ಬೆಲೆ, ವೆಬ್ ವಿಳಾಸ ಮತ್ತು ಆರ್ಡರ್ ಪೇಜ್ ಸಹಾಯಕ ಸಿದ್ಧಪಡಿಸುತ್ತದೆ.",
    start: "ನನ್ನ ಅಡುಗೆಮನೆ ಶುರು ಮಾಡಿ",
    demo: "ಡೆಮೊ ಮೆನು ನೋಡಿ",
    tiers: ["ಚಪಾತಿ ಪಲ್ಯ", "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", "ಶಾವಿಗೆ ಪಾಯಸ"],
    dayTitle: "ಒಂದು ದಿನ ಹೀಗೆ ನಡೆಯುತ್ತದೆ",
    day: [
      ["ಬೆಳಿಗ್ಗೆ", "ಇಂದಿನ ಮೆನು ಹೇಳಿ. ಪೇಜ್ ತಕ್ಷಣ ಬದಲಾಗುತ್ತದೆ, WhatsApp ಸಂದೇಶ ಸಿದ್ಧ."],
      ["ಹಗಲು", "ಗ್ರಾಹಕರು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮೆನು ಓದಿ ಆರ್ಡರ್ ಮಾಡುತ್ತಾರೆ."],
      ["ಕೊನೆಯ ಸಮಯ", "ಏನು ಎಷ್ಟು ಮಾಡಬೇಕು, ಯಾರಿಗೆ ಎಲ್ಲಿಗೆ ಎಂದು ಸಹಾಯಕ ಹೇಳುತ್ತದೆ."],
    ],
    forCustomers: "ಗ್ರಾಹಕರಿಗೆ",
    customersText: "ಆ್ಯಪ್ ಬೇಡ, ಖಾತೆ ಬೇಡ. ಲಿಂಕ್ ತೆರೆಯಿರಿ, ಆರ್ಡರ್ ಮಾಡಿ, ಡೆಲಿವರಿಯಲ್ಲಿ ಪಾವತಿಸಿ.",
    trust: "ನಿಮ್ಮ ಒಪ್ಪಿಗೆ ಇಲ್ಲದೆ ಏನೂ ಬದಲಾಗುವುದಿಲ್ಲ",
    trustText: "ಮೆನು, ಪ್ರಕಟಣೆ, ಆರ್ಡರ್ ರದ್ದು — ಪ್ರತಿಯೊಂದಕ್ಕೂ ನೀವು ‘ಹೌದು’ ಒತ್ತಬೇಕು.",
  },
  hi: {
    title: "आपकी रसोई, आपकी भाषा में।",
    lead: "आप बोलिए। मेन्यू, दाम, वेब पता और ऑर्डर पेज सहायक तैयार कर देगा।",
    start: "मेरी रसोई शुरू करें",
    demo: "डेमो मेन्यू देखें",
    tiers: ["चपाती पल्य", "बिसि बेले बाथ", "शाविगे पायसा"],
    dayTitle: "एक दिन ऐसे चलता है",
    day: [
      ["सुबह", "आज का मेन्यू बोलिए। पेज तुरंत बदलता है, WhatsApp संदेश तैयार।"],
      ["दिन में", "ग्राहक अपनी भाषा में मेन्यू पढ़कर ऑर्डर करते हैं।"],
      ["आख़िरी समय", "सहायक बताता है क्या कितना बनाना है, और किसे कहाँ पहुँचाना है।"],
    ],
    forCustomers: "ग्राहकों के लिए",
    customersText: "न ऐप, न खाता। लिंक खोलिए, ऑर्डर कीजिए, डिलीवरी पर भुगतान।",
    trust: "आपकी हाँ के बिना कुछ नहीं बदलता",
    trustText: "मेन्यू, पेज प्रकाशित करना, ऑर्डर रद्द करना — हर बार आपको ‘हाँ’ दबाना होगा।",
  },
  en: {
    title: "Your kitchen, in your language.",
    lead: "Just talk. The assistant sets up your menu, prices, web address and ordering page.",
    start: "Start my kitchen",
    demo: "See a live menu",
    tiers: ["Chapati palya", "Bisi bele bath", "Shavige payasa"],
    dayTitle: "How a day goes",
    day: [
      ["Morning", "Say today's menu. The page updates at once, with a WhatsApp message ready to send."],
      ["Daytime", "Customers read the menu in their own language and order."],
      ["Cut-off", "The assistant tells you what to cook, how much, and who it goes to."],
    ],
    forCustomers: "For customers",
    customersText: "No app, no account. Open the link, order, pay on delivery.",
    trust: "Nothing changes until you say yes",
    trustText: "Menus, publishing, cancelling an order: each one waits for you to tap Yes.",
  },
};

const LANGS: { code: Lang; label: string }[] = [
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिन्दी" },
  { code: "en", label: "English" },
];

export default function Home() {
  const [lang, setLang] = useState<Lang>("kn");
  const t = COPY[lang];

  return (
    <div className={styles.page} lang={lang}>
      <header className={styles.bar}>
        <span className={styles.brand}>Tiffin</span>
        <nav className={styles.langs} aria-label="Language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              aria-pressed={l.code === lang}
              className={l.code === lang ? styles.langOn : styles.lang}
              onClick={() => setLang(l.code)}
            >
              {l.label}
            </button>
          ))}
        </nav>
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
              <Link href="/k/lakshmi-tiffins" className={styles.secondary}>
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

        <section className={styles.pair}>
          <div>
            <h2>{t.forCustomers}</h2>
            <p>{t.customersText}</p>
          </div>
          <div>
            <h2>{t.trust}</h2>
            <p>{t.trustText}</p>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        Built with Claude and GoDaddy for the Inclusive Innovation Hackathon 2026.
      </footer>
    </div>
  );
}
