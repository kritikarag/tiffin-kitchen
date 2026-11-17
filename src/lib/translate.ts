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
