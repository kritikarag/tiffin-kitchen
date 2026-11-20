import type { AgentStep } from "@/lib/agent";
import type { OwnerLang } from "./voice";
import styles from "./owner.module.css";

// Shows what the agent actually did this turn, above its reply: each tool call, whether it ran or is waiting
// for her Yes, and which system did the work. The facts come from the tool results, not from Claude's wording.

type Info = AgentStep["info"];
type Words = Record<string, (i: Info) => string>;

const WORDS: Record<
  OwnerLang,
  {
    heading: string;
    waiting: string;
    cancelled: string;
    failed: string;
    tools: Words;
  }
> = {
  en: {
    heading: "What I did",
    waiting: "not done yet, waiting for your Yes",
    cancelled: "you said No",
    failed: "didn't work",
    tools: {
      check_domain: (i) =>
        `Checked ${i.domain}: ${i.available ? "available" : "taken"}`,
      register_domain: (i) => `Reserved ${i.domain}`,
      create_kitchen: (i) =>
        `Saved ${i.name}${i.dishes ? ` with ${i.dishes} dishes` : ""}`,
      publish_site: () => "Put your page online",
      update_menu: (i) =>
        i.holiday
          ? `Marked ${i.date} as a holiday`
          : `Set the menu for ${i.date}${i.dishes ? `: ${i.dishes} dishes` : ""}${i.cutoff ? `, orders until ${i.cutoff}` : ""}`,
      mark_sold_out: (i) =>
        i.soldOut ? "Marked a dish sold out" : "Put a dish back on sale",
      get_orders: (i) =>
        `Read today's orders: ${i.orders} orders, ${i.plates} plates`,
      cancel_order: (i) => `Cancelled ${i.customer || "the"} order`,
    },
  },
  hi: {
    heading: "मैंने क्या किया",
    waiting: "अभी नहीं किया, आपकी हाँ का इंतज़ार",
    cancelled: "आपने मना किया",
    failed: "नहीं हो पाया",
    tools: {
      check_domain: (i) =>
        `${i.domain} जाँचा: ${i.available ? "उपलब्ध" : "पहले से लिया हुआ"}`,
      register_domain: (i) => `${i.domain} आपके लिए रखा`,
      create_kitchen: (i) =>
        `${i.name} सेव की${i.dishes ? `, ${i.dishes} व्यंजन` : ""}`,
      publish_site: () => "आपका पेज ऑनलाइन किया",
      update_menu: (i) =>
        i.holiday
          ? `${i.date} को छुट्टी रखी`
          : `${i.date} का मेन्यू तय किया${i.dishes ? `: ${i.dishes} व्यंजन` : ""}${i.cutoff ? `, ऑर्डर ${i.cutoff} तक` : ""}`,
      mark_sold_out: (i) =>
        i.soldOut ? "एक व्यंजन खत्म दिखाया" : "एक व्यंजन फिर से उपलब्ध किया",
      get_orders: (i) => `आज के ऑर्डर देखे: ${i.orders} ऑर्डर, ${i.plates} प्लेट`,
      cancel_order: (i) => `${i.customer || ""} का ऑर्डर रद्द किया`,
    },
  },
  kn: {
    heading: "ನಾನು ಮಾಡಿದ್ದು",
    waiting: "ಇನ್ನೂ ಮಾಡಿಲ್ಲ, ನಿಮ್ಮ ಹೌದುಗಾಗಿ ಕಾಯುತ್ತಿದೆ",
    cancelled: "ನೀವು ಬೇಡ ಎಂದಿರಿ",
    failed: "ಆಗಲಿಲ್ಲ",
    tools: {
      check_domain: (i) =>
        `${i.domain} ನೋಡಿದೆ: ${i.available ? "ಲಭ್ಯವಿದೆ" : "ಈಗಾಗಲೇ ತೆಗೆದುಕೊಂಡಿದ್ದಾರೆ"}`,
      register_domain: (i) => `${i.domain} ನಿಮಗಾಗಿ ಇಟ್ಟೆ`,
      create_kitchen: (i) =>
        `${i.name} ಉಳಿಸಿದೆ${i.dishes ? `, ${i.dishes} ತಿನಿಸುಗಳು` : ""}`,
      publish_site: () => "ನಿಮ್ಮ ಪುಟ ಆನ್‌ಲೈನ್ ಮಾಡಿದೆ",
      update_menu: (i) =>
        i.holiday
          ? `${i.date} ರಜೆ ಎಂದು ಗುರುತಿಸಿದೆ`
          : `${i.date} ಮೆನು ಹಾಕಿದೆ${i.dishes ? `: ${i.dishes} ತಿನಿಸುಗಳು` : ""}${i.cutoff ? `, ${i.cutoff} ವರೆಗೆ ಆರ್ಡರ್` : ""}`,
      mark_sold_out: (i) =>
        i.soldOut ? "ಒಂದು ತಿನಿಸು ಖಾಲಿ ಎಂದು ಗುರುತಿಸಿದೆ" : "ಒಂದು ತಿನಿಸು ಮತ್ತೆ ಲಭ್ಯ ಮಾಡಿದೆ",
      get_orders: (i) => `ಇಂದಿನ ಆರ್ಡರ್ ನೋಡಿದೆ: ${i.orders} ಆರ್ಡರ್, ${i.plates} ಪ್ಲೇಟ್`,
      cancel_order: (i) => `${i.customer || ""} ಆರ್ಡರ್ ರದ್ದು ಮಾಡಿದೆ`,
    },
  },
};

// Which system did the work: shown as a small tag, so the agent's use of real services is visible.
const SOURCE: Record<string, (i: Info) => string> = {
  check_domain: (i) => (i.simulated ? "GoDaddy · test" : "GoDaddy"),
  register_domain: (i) => (i.simulated ? "GoDaddy · test" : "GoDaddy"),
  create_kitchen: () => "Claude + database",
  publish_site: () => "Hosting",
  update_menu: () => "Database",
  mark_sold_out: () => "Database",
  get_orders: () => "Database",
  cancel_order: () => "Database",
};

export default function AgentSteps({
  steps,
  lang,
}: {
  steps: AgentStep[];
  lang: OwnerLang;
}) {
  const w = WORDS[lang];
  const shown = steps.filter((s) => w.tools[s.tool]);
  if (shown.length === 0) return null;
  return (
    <div className={styles.steps}>
      <span className={styles.stepsHeading}>{w.heading}</span>
      <ol>
        {shown.map((s, i) => (
          <li key={i} className={styles[`step_${s.status}`]}>
            <span className={styles.stepIcon} aria-hidden="true">
              {
                { done: "✓", waiting: "⏳", cancelled: "✕", failed: "!" }[
                  s.status
                ]
              }
            </span>
            <span className={styles.stepText}>
              {w.tools[s.tool](s.info)}
              {s.status !== "done" && <em> · {w[s.status]}</em>}
            </span>
            <span className={styles.stepSource}>
              {SOURCE[s.tool]?.(s.info)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
