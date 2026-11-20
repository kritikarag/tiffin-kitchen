// Translates the app's fixed labels, and the demo kitchens' text, into every language in LANGUAGES.
// English, Hindi and Kannada are written by hand in the code; this fills in the rest with Claude, using the
// English as the source and the Hindi and Kannada as examples of tone.
// Run with: npm run labels            (needs ANTHROPIC_API_KEY in .env)
// Only missing languages are translated, so it is safe to run again after adding a language or a label.
// Add FORCE=1 to redo everything. Results: src/lib/labels.generated.json and scripts/demo-translations.json.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CUSTOMER_LABELS, LANGUAGES } from "../src/lib/i18n";
import { OWNER_LABELS } from "../src/app/owner/labels";
import { STEP_LABELS } from "../src/app/owner/stepLabels";
import { WHATSAPP_LABELS } from "../src/lib/orders";
import { HOME_COPY } from "../src/app/homeCopy";
import { dishes, kitchen, others } from "./demo-data.mjs";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
// English is the source. Hindi and Kannada, when written by hand, are used as examples of tone and are not
// translated again; a section with only English (the home page) is translated into all eight others.
type Source = { en: Json; hi?: Json; kn?: Json };
type Language = (typeof LANGUAGES)[number];

const SECTIONS: Record<string, Source> = {
  customer: CUSTOMER_LABELS,
  owner: OWNER_LABELS,
  steps: STEP_LABELS,
  whatsapp: WHATSAPP_LABELS,
  home: HOME_COPY as Source,
};

const LABELS_FILE = path.join(process.cwd(), "src/lib/labels.generated.json");
const DEMO_FILE = path.join(process.cwd(), "scripts/demo-translations.json");
const FORCE = process.env.FORCE === "1";
const TARGETS = LANGUAGES.filter((l) => !["en", "hi", "kn"].includes(l.code));
const client = new Anthropic();

const STYLE = (name: string) =>
  `You translate the interface of Tiffin, an app for home tiffin kitchens in India. The users are home cooks, ` +
  `who may not read comfortably, and their customers. Write short, plain, warm, everyday ${name} as people speak it ` +
  `in Indian cities, not formal or literary ${name}. Common English words people really use (order, menu, plate, ` +
  `online, WhatsApp, UPI) may stay, written the way ${name} speakers write them. Keep exactly as they are: every ` +
  `JSON key, every {placeholder}, emoji, ₹ amounts, and the names Tiffin, WhatsApp, UPI, GoDaddy, Claude and Chrome.`;

async function ask(system: string, prompt: string): Promise<unknown> {
  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 16000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  // Trailing commas are the most common slip in long replies; drop them before parsing.
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1).replace(/,(\s*[\]}])/g, "$1"));
}

// The same keys all the way down, and the same {placeholders} in every string.
function sameShape(source: Json, result: unknown, path = ""): string | null {
  if (typeof source === "string") {
    if (typeof result !== "string" || !result.trim()) return `${path}: missing text`;
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    return holes(source) === holes(result) ? null : `${path}: placeholders changed`;
  }
  if (Array.isArray(source)) {
    if (!Array.isArray(result) || result.length !== source.length) return `${path}: list length changed`;
    for (const [i, item] of source.entries()) {
      const problem = sameShape(item, result[i], `${path}[${i}]`);
      if (problem) return problem;
    }
    return null;
  }
  if (source && typeof source === "object") {
    if (!result || typeof result !== "object") return `${path}: not an object`;
    for (const key of Object.keys(source)) {
      const problem = sameShape(source[key], (result as Record<string, unknown>)[key], `${path}.${key}`);
      if (problem) return problem;
    }
    return null;
  }
  return null; // numbers and booleans are not translated
}

// Runs jobs a few at a time, so a run doesn't hit the API's rate limit.
async function pool<T>(jobs: (() => Promise<T>)[], size = 6): Promise<T[]> {
  const results: T[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < jobs.length) {
        const i = next++;
        results[i] = await jobs[i]();
      }
    }),
  );
  return results;
}

async function translateSection(section: string, source: Source, lang: Language): Promise<Json | null> {
  const prompt =
    `English:\n${JSON.stringify(source.en, null, 2)}\n\n` +
    (source.hi ? `The same in Hindi, for tone:\n${JSON.stringify(source.hi, null, 2)}\n\n` : "") +
    (source.kn ? `The same in Kannada, for tone:\n${JSON.stringify(source.kn, null, 2)}\n\n` : "") +
    `Write the ${lang.name} version. Reply with only the JSON object, with the same keys.`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await ask(STYLE(lang.name), prompt);
      const problem = sameShape(source.en, result);
      if (!problem) return result as Json;
      console.warn(`  ${section}/${lang.code} attempt ${attempt}: ${problem}`);
    } catch (error) {
      console.warn(`  ${section}/${lang.code} attempt ${attempt} failed:`, (error as Error).message);
    }
  }
  return null;
}

// ---- demo kitchens: names, areas, dishes ----
type DemoItem = { key: string; kind: "kitchen" | "dish"; en: Record<string, string>; hi: Record<string, string>; kn: Record<string, string> };

function demoItems(): DemoItem[] {
  const items: DemoItem[] = [];
  const k = kitchen.translations;
  items.push({ key: k.en.name, kind: "kitchen", en: k.en, hi: k.hi, kn: k.kn });
  for (const d of dishes) items.push({ key: d.translations.en.name, kind: "dish", en: d.translations.en, hi: d.translations.hi, kn: d.translations.kn });
  for (const o of others) {
    const pick = (l: "en" | "hi" | "kn") => ({ name: o.names[l][0], delivery_area: o.names[l][1] });
    items.push({ key: o.names.en[0], kind: "kitchen", en: pick("en"), hi: pick("hi"), kn: pick("kn") });
    for (const [, tr] of o.dishes as [number, Record<"en" | "hi" | "kn", Record<string, string>>][]) items.push({ key: tr.en.name, kind: "dish", en: tr.en, hi: tr.hi, kn: tr.kn });
  }
  return items;
}

async function translateDemo(items: DemoItem[], lang: Language): Promise<Record<string, Json> | null> {
  const source = Object.fromEntries(items.map((i) => [i.key, i.en]));
  const prompt =
    `Kitchen names, delivery areas and dishes for a demo. Transliterate names, places and dish names into ${lang.name} ` +
    `script; never translate them ("Bisi Bele Bath" stays Bisi Bele Bath, written in ${lang.name} script). ` +
    `Translate only the descriptions.\n\nEnglish:\n${JSON.stringify(source, null, 2)}\n\n` +
    `Hindi, for reference:\n${JSON.stringify(Object.fromEntries(items.map((i) => [i.key, i.hi])), null, 2)}\n\n` +
    `Reply with only a JSON object with the same keys and fields, in ${lang.name}.`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await ask(STYLE(lang.name), prompt);
      const problem = sameShape(source as Json, result);
      if (!problem) return result as Record<string, Json>;
      console.warn(`  demo/${lang.code} attempt ${attempt}: ${problem}`);
    } catch (error) {
      console.warn(`  demo/${lang.code} attempt ${attempt} failed:`, (error as Error).message);
    }
  }
  return null;
}

async function main() {
  const labels = JSON.parse(readFileSync(LABELS_FILE, "utf8")) as Record<string, Record<string, Json>>;
  const jobs: (() => Promise<void>)[] = [];
  for (const [section, source] of Object.entries(SECTIONS)) {
    labels[section] ??= {};
    const handWritten = Object.keys(source);
    for (const lang of LANGUAGES.filter((l) => !handWritten.includes(l.code))) {
      const existing = labels[section][lang.code];
      if (!FORCE && existing && !sameShape(source.en, existing)) continue;
      jobs.push(async () => {
        const result = await translateSection(section, source, lang);
        if (result) labels[section][lang.code] = result;
        console.log(`${result ? "✓" : "✕"} ${section} → ${lang.name}`);
      });
    }
  }

  const demo = JSON.parse(readFileSync(DEMO_FILE, "utf8")) as Record<string, Record<string, Json>>;
  const items = demoItems();
  for (const lang of TARGETS) {
    if (!FORCE && items.every((i) => demo[i.key]?.[lang.code])) continue;
    jobs.push(async () => {
      const result = await translateDemo(items, lang);
      if (result) for (const [key, value] of Object.entries(result)) (demo[key] ??= {})[lang.code] = value;
      console.log(`${result ? "✓" : "✕"} demo kitchens → ${lang.name}`);
    });
  }

  if (jobs.length === 0) console.log("Every language is already translated.");
  await pool(jobs);
  writeFileSync(LABELS_FILE, `${JSON.stringify(labels, null, 2)}\n`);
  writeFileSync(DEMO_FILE, `${JSON.stringify(demo, null, 2)}\n`);
  console.log("Saved src/lib/labels.generated.json and scripts/demo-translations.json.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
