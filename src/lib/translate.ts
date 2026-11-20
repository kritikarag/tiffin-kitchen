import { LANGUAGES, type Lang } from "./i18n";
import type { ModelCall } from "./model";

export type Translations = Partial<Record<Lang, { name: string; description: string }>>;
export type KitchenTranslations = Partial<Record<Lang, { name: string; delivery_area: string }>>;

type Language = (typeof LANGUAGES)[number];

// Every language is translated in its own small call, all at the same time, on the fast model.
// One call for all nine languages would return thousands of tokens and keep her waiting after she taps Yes;
// nine small calls finish in about the time of one. A language that fails is simply left out, and pages
// fall back to English, then to what the owner said.

function scriptOf(l: Language): string {
  return l.code === "en" ? "English, with the usual English spelling" : `${l.name} (${l.label}), in ${l.name} script`;
}

// The tool call's input, or null if Claude answered some other way.
function toolInput(content: { type: string; input?: unknown }[]): Record<string, unknown> | null {
  const call = content.find((b) => b.type === "tool_use");
  return (call?.input as Record<string, unknown>) ?? null;
}

async function dishesIn(model: ModelCall, l: Language, names: string[]): Promise<{ name: string; description: string }[] | null> {
  const response = await model({
    fast: true,
    system:
      "You prepare menu text for a home tiffin service in India. For each dish, give its name and a one-line " +
      "description in the requested language. Dish names are transliterated, never translated: " +
      '"bisi bele bath" stays "bisi bele bath" in every script. Descriptions are plain and under 12 words.',
    messages: [
      {
        role: "user",
        content: `Language: ${l.code}\nWrite these dishes in ${scriptOf(l)}, then call save_translations with them in the same order:\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}`,
      },
    ],
    tools: [
      {
        name: "save_translations",
        description: "Save the dishes in this language, in the same order they were given.",
        input_schema: {
          type: "object",
          properties: {
            dishes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The dish name in this language's script. Transliterate it; do not translate it." },
                  description: { type: "string", description: "One short line saying what the dish is, in this language." },
                },
                required: ["name", "description"],
              },
            },
          },
          required: ["dishes"],
        },
      },
    ],
    maxTokens: 4000,
  });
  const dishes = toolInput(response.content)?.dishes;
  if (!Array.isArray(dishes) || dishes.length !== names.length) return null;
  return dishes.map((d) => {
    const entry = (d ?? {}) as { name?: unknown; description?: unknown };
    return {
      name: typeof entry.name === "string" ? entry.name.trim().slice(0, 160) : "",
      description: typeof entry.description === "string" ? entry.description.trim().slice(0, 200) : "",
    };
  });
}

export async function translateDishes(model: ModelCall, names: string[]): Promise<Translations[]> {
  const result = names.map(() => ({}) as Translations);
  if (names.length === 0) return result;
  const perLanguage = await Promise.all(
    LANGUAGES.map((l) =>
      dishesIn(model, l, names).catch((error) => {
        console.error(`Dish translation into ${l.name} failed`, error);
        return null;
      }),
    ),
  );
  LANGUAGES.forEach((l, li) => {
    perLanguage[li]?.forEach((dish, di) => {
      if (dish.name) result[di][l.code] = dish;
    });
  });
  return result;
}

// The kitchen's name and delivery area, written in each language's script so every customer can read them.
// Names and place names are transliterated, never translated: "Lakshmi Tiffins" stays Lakshmi Tiffins.
async function kitchenIn(model: ModelCall, l: Language, name: string, deliveryArea: string): Promise<{ name: string; delivery_area: string } | null> {
  const response = await model({
    fast: true,
    system:
      "You write a home kitchen's name and delivery areas in Indian scripts. Transliterate; never translate. " +
      '"Lakshmi Tiffins" in Hindi is "लक्ष्मी टिफ़िन्स", and "Indiranagar" is "इंदिरानगर". In English, use the usual English spelling.',
    messages: [{ role: "user", content: `Language: ${l.code}\nWrite these in ${scriptOf(l)}, then call save_kitchen_text.\nName: ${name}\nDelivery areas: ${deliveryArea}` }],
    tools: [
      {
        name: "save_kitchen_text",
        description: "Save the kitchen name and delivery areas in this language.",
        input_schema: {
          type: "object",
          properties: {
            name: { type: "string", description: "The kitchen name in this language's script, transliterated." },
            delivery_area: { type: "string", description: "The delivery areas in this language's script, transliterated, comma separated." },
          },
          required: ["name", "delivery_area"],
        },
      },
    ],
    maxTokens: 2000,
  });
  const input = toolInput(response.content);
  if (typeof input?.name !== "string" || !input.name.trim() || typeof input.delivery_area !== "string") return null;
  return { name: input.name.trim().slice(0, 160), delivery_area: input.delivery_area.trim().slice(0, 255) };
}

export async function translateKitchen(model: ModelCall, name: string, deliveryArea: string): Promise<KitchenTranslations> {
  const perLanguage = await Promise.all(
    LANGUAGES.map((l) =>
      kitchenIn(model, l, name, deliveryArea).catch((error) => {
        console.error(`Kitchen translation into ${l.name} failed`, error);
        return null;
      }),
    ),
  );
  const result: KitchenTranslations = {};
  LANGUAGES.forEach((l, i) => {
    const text = perLanguage[i];
    if (text) result[l.code] = text;
  });
  return result;
}
