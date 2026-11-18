import { LANGUAGES, type Lang } from "./i18n";
import type { ModelCall } from "./model";

export type Translations = Partial<Record<Lang, { name: string; description: string }>>;

const perLanguage = {
  type: "object",
  properties: {
    name: { type: "string", description: "The dish name written in this language's script. Transliterate it; do not translate it." },
    description: { type: "string", description: "One short line saying what the dish is, in this language." },
  },
  required: ["name", "description"],
};

// One Claude call translates all the dishes. Forcing the save_translations tool means the answer
// comes back as JSON in a known shape instead of free text we would have to parse.
// If the call fails, each dish gets {} and the menu page falls back to the owner's original name.
export async function translateDishes(model: ModelCall, names: string[]): Promise<Translations[]> {
  const empty = names.map(() => ({}) as Translations);
  if (names.length === 0) return empty;
  try {
    const response = await model({
      system:
        "You prepare menu text for a home tiffin service in India. For each dish, give its name and a one-line " +
        "description in every requested language. Dish names are transliterated, never translated: " +
        '"bisi bele bath" stays "bisi bele bath" in every script. Descriptions are plain and under 12 words.',
      messages: [{ role: "user", content: `Call save_translations for these dishes, in order:\n${names.map((n, i) => `${i + 1}. ${n}`).join("\n")}` }],
      tools: [
        {
          name: "save_translations",
          description: "Save the translated dishes, in the same order they were given.",
          input_schema: {
            type: "object",
            properties: {
              dishes: {
                type: "array",
                items: {
                  type: "object",
                  properties: Object.fromEntries(LANGUAGES.map((l) => [l.code, perLanguage])),
                  required: LANGUAGES.map((l) => l.code),
                },
              },
            },
            required: ["dishes"],
          },
        },
      ],
      // Forcing a specific tool (tool_choice) is not supported on every model, so the prompt asks for it
      // instead, and anything other than a save_translations call is treated as a failure below.
      maxTokens: 2000,
    });
    const call = response.content.find((b) => b.type === "tool_use");
    const dishes = (call?.type === "tool_use" ? (call.input as { dishes?: unknown }).dishes : null) as unknown[] | null;
    if (!Array.isArray(dishes) || dishes.length !== names.length) return empty;

    return dishes.map((dish) => {
      const result: Translations = {};
      for (const { code } of LANGUAGES) {
        const entry = (dish as Record<string, { name?: unknown; description?: unknown }>)?.[code];
        if (typeof entry?.name === "string" && entry.name.trim()) {
          result[code] = {
            name: entry.name.trim().slice(0, 160),
            description: typeof entry.description === "string" ? entry.description.trim().slice(0, 200) : "",
          };
        }
      }
      return result;
    });
  } catch (error) {
    console.error("Translation failed", error);
    return empty;
  }
}

export type KitchenTranslations = Partial<Record<Lang, { name: string; delivery_area: string }>>;

// The kitchen's name and delivery area, written in each language's script so every customer can read them.
// Names and place names are transliterated, never translated: "Lakshmi Tiffins" stays Lakshmi Tiffins.
// On failure it returns {}, and the page shows what the owner said.
export async function translateKitchen(model: ModelCall, name: string, deliveryArea: string): Promise<KitchenTranslations> {
  const perLanguage = {
    type: "object",
    properties: {
      name: { type: "string", description: "The kitchen name in this language's script, transliterated." },
      delivery_area: { type: "string", description: "The delivery areas in this language's script, transliterated, comma separated." },
    },
    required: ["name", "delivery_area"],
  };
  try {
    const response = await model({
      system:
        "You write a home kitchen's name and delivery areas in other Indian scripts. Transliterate; never translate. " +
        '"Lakshmi Tiffins" in Hindi is "लक्ष्मी टिफ़िन्स", and "Indiranagar" is "इंदिरानगर". In English, use the usual English spelling.',
      messages: [{ role: "user", content: `Call save_kitchen_text.\nName: ${name}\nDelivery areas: ${deliveryArea}` }],
      tools: [
        {
          name: "save_kitchen_text",
          description: "Save the kitchen name and delivery areas in every language.",
          input_schema: {
            type: "object",
            properties: Object.fromEntries(LANGUAGES.map((l) => [l.code, perLanguage])),
            required: LANGUAGES.map((l) => l.code),
          },
        },
      ],
      maxTokens: 600,
    });
    const call = response.content.find((b) => b.type === "tool_use");
    const input = (call?.type === "tool_use" ? call.input : null) as Record<string, { name?: unknown; delivery_area?: unknown }> | null;
    const result: KitchenTranslations = {};
    for (const { code } of LANGUAGES) {
      const entry = input?.[code];
      if (typeof entry?.name === "string" && entry.name.trim() && typeof entry.delivery_area === "string") {
        result[code] = { name: entry.name.trim().slice(0, 160), delivery_area: entry.delivery_area.trim().slice(0, 255) };
      }
    }
    return result;
  } catch (error) {
    console.error("Kitchen translation failed", error);
    return {};
  }
}
