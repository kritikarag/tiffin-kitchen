import { labelsFor, type Lang } from "@/lib/i18n";

// The home page's words, written in English. `npm run labels` translates them into the other eight languages
// (labels.generated.json); lists keep their length in every language. Tool names stay in code font, untranslated.

const en = {
  langLabel: "Language",
  nav: { day: "A day", agent: "The agent", languages: "Languages", trust: "Safety", demo: "Try the demo" },
  title: "Your kitchen, in your language.",
  lead: "Affordable home food from the cook next door, for daily-wage workers, students and office workers alike. She runs her kitchen by speaking her own language, and you order in yours. No app, no commission, no English needed.",
  start: "Start my kitchen",
  demo: "Browse kitchens",
  newOrder: "New order",
  myKitchen: "Your kitchen",
  myKitchenOrders: "{count} orders today, {delivered} delivered",
  myKitchenOpen: "Open my kitchen",
  stats: [
    ["9", "Indian languages, both ways"],
    ["₹0", "commission on her food"],
    ["0", "apps to install"],
  ],
  tiers: ["Dal tadka", "Paneer butter masala", "Jeera rice"],

  dayTitle: "One day in Lakshmi's kitchen",
  dayLead: "Tap a moment to see what happens on her screen.",
  moments: [
    ["7:30 am", "She speaks the menu", "No typing. The assistant reads it back and waits for her Yes before customers see it."],
    ["9:10 am", "Orders come in", "Customers order in their own language and pay her by UPI. Each order rings on her screen."],
    ["10:40 am", "The paneer runs out", "She says so once. Customers see it as sold out at once."],
    ["11:00 am", "Cut-off: what to cook", "Allergy notes come first, then exact totals and deliveries by area."],
    ["2:00 pm", "The dabbas come back", "Every steel box is counted, so none goes missing."],
  ],
  stepsHeading: "What I did",
  waiting: "waiting for your Yes",
  yes: "Yes",
  no: "No",
  m1Said: "Today, rajma chawal and aloo paratha. Orders until eleven.",
  m1Step: "Set today's menu: 2 dishes, orders until 11:00",
  m1Reply: "Shall I put today's menu up?",
  m2Who: "Priya, Domlur",
  m2Items: "2 × Rajma chawal, 1 × Aloo paratha",
  m2Paid: "Paid ₹210 by UPI",
  m3Said: "The paneer is finished.",
  m3Step: "Marked a dish sold out",
  m3Dish: "Paneer butter masala",
  m3SoldOut: "Sold out",
  m4Alert: "Allergy or health note",
  m4AlertText: "Farhan, 2 × Rajma chawal: peanut allergy, add no peanuts at all.",
  m4Cook: "To cook",
  m4Totals: [
    ["14", "Rajma chawal"],
    ["9", "Aloo paratha"],
    ["6", "Paneer butter masala"],
  ],
  m5Said: "Ravi brought back two dabbas.",
  m5Step: "Ravi returned 2 dabbas, 1 still out",
  m5Out: "dabbas still with customers",

  agentTitle: "Claude decides. Code checks. She says Yes.",
  agentLead: "The assistant is an agent: it picks a tool, the app checks the call, and the result goes back to Claude, until the job is done.",
  flow: ["She speaks, or sends a photo", "Claude picks the next tool", "The app checks every input", "Anything that changes her business waits for her Yes"],
  flowNote: "At most 8 steps a turn. Every step shows on her screen, with the system that did it.",
  groups: ["Launch", "Every day", "Around the kitchen"],
  outcomes: [
    ["Does it at once", "Small things that are easy to undo, like a dish selling out"],
    ["Waits for her Yes", "Anything that changes her menu, her page or an order"],
    ["Never invents numbers", "Counts and totals come from the database"],
  ],

  langTitle: "Nine languages, both ways",
  langText: "She writes the menu in her language. Each customer reads it in theirs. What customers write comes back to her in hers. Tap a language to switch this page.",
  noteFrom: "A customer writes, in Tamil",
  noteTo: "She reads, in Kannada",

  trustTitle: "The guardrails are code, not a prompt.",
  trust: [
    ["Nothing changes without her Yes", "Menus, publishing and cancellations wait for a button tap, never a word that could be misheard."],
    ["Every step is shown", "Each reply lists what the assistant did and which system did it."],
    ["Numbers come from the database", "Orders, totals and dabbas are counted by the database, never guessed."],
    ["Ordering never depends on AI", "If the assistant is down, customers can still order."],
    ["Allergies stand out", "A note about an allergy or health shows in red, translated, with the original below it."],
    ["No commission, no platform fee", "Customers pay her directly by UPI or cash. Her price, including any delivery she charges, is what they pay."],
  ],

  withoutTitle: "Without Tiffin",
  without: [
    "The menu is a WhatsApp status half the customers miss",
    "Orders counted by hand from scattered messages",
    "English forms and dashboards on every platform",
    "Boxes and payments tracked in a notebook",
    "Customers calling to ask where their food is",
  ],
  withTitle: "With Tiffin",
  with: [
    "She speaks the menu; it's live when she taps Yes",
    "Exact totals and a cooking list at cut-off",
    "Her language on her side, theirs on theirs",
    "UPI straight to her, and every dabba counted",
    "Customers track every order, today's and past ones, with no account",
  ],

  ctaTitle: "See it work in a minute.",
  ctaText: "The demo kitchen has a morning of orders in several languages.",
  ctaCook: "Try it as the cook",
  ctaCustomer: "Order as a customer",
  footer: "Built with Claude and GoDaddy for the Inclusive Innovation Hackathon 2026.",
  contact: "Questions? Write to us at",
};

export type HomeCopy = typeof en;

export const HOME_COPY: { en: HomeCopy } = { en };

export function homeCopy(lang: Lang): HomeCopy {
  return labelsFor<HomeCopy>(HOME_COPY, "home", lang);
}

// One dish, written in each script: the clearest way to show that a name is transliterated, not translated.
export const ONE_DISH: Record<Lang, string> = {
  en: "Paneer Butter Masala",
  hi: "पनीर बटर मसाला",
  kn: "ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ",
  ta: "பனீர் பட்டர் மசாலா",
  te: "పనీర్ బటర్ మసాలా",
  ml: "പനീർ ബട്ടർ മസാല",
  mr: "पनीर बटर मसाला",
  bn: "পনির বাটার মসলা",
  gu: "પનીર બટર મસાલા",
};

// The eleven tools, by what they are for. Code names, so they are never translated.
export const TOOL_GROUPS: string[][] = [
  ["create_kitchen", "check_domain", "register_domain", "publish_site"],
  ["update_menu", "mark_sold_out", "get_orders", "mark_delivery", "cancel_order"],
  ["update_customer_boxes", "update_kitchen_details"],
];

// Orders as customers really write them, each in their own script, popping up around the tiffin carrier.
export const TICKETS = [
  { who: "Priya", text: "राजमा चावल × 2 · कम तीखा" },
  { who: "Arun", text: "Paneer butter masala × 1" },
  { who: "Kavya", text: "ஆலூ பராத்தா × 3" },
];

// The note example in the languages section: written in Tamil, read in Kannada.
export const NOTE_EXAMPLE = { written: "காரம் குறைவாக, வேர்க்கடலை வேண்டாம்", read: "ಖಾರ ಕಡಿಮೆ, ಕಡಲೆಕಾಯಿ ಬೇಡ" };
