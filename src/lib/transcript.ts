import Anthropic from "@anthropic-ai/sdk";
import type { RowDataPacket } from "mysql2";
import { db } from "./db";

// The browser's built-in speech recognition often mishears Indian dish names and mixed Hindi-English
// ("choleba today" for "chole bhature", "pavaji" for "pav bhaji"). Before the words reach the owner's
// edit box, a fast Claude model fixes those mistakes, using her saved dishes as hints.
// It never sends anything: she still checks the box and taps Send.

let client: Anthropic | undefined;

const SYSTEM = `You fix speech-recognition mistakes in what an Indian home cook dictated to her tiffin-service assistant.
- Fix misheard Indian dish names and food words. Speech recognition turns them into English words that sound alike, so read for what a cook would say: "choleba today" -> "chole bhature", "pavaji" -> "pav bhaji", "cholesterol" -> "chole bhature" (nobody prices cholesterol), "dal fry" stays "dal fry".
- An English word that makes no sense next to a price or a menu is almost always a misheard dish; replace it with the dish it sounds like, preferring dishes mentioned elsewhere in the same text.
- Prefer the spellings of her saved dishes when a word sounds like one of them.
- Keep her language, script, wording and meaning. Do not translate, summarise, add or remove anything.
- Never change numbers or prices. If a number looks odd, leave it exactly as it is.
- If nothing needs fixing, return the text unchanged.
Reply with the corrected text only, with no quotes or explanation.`;

// Saved dish names for the kitchen in this conversation, if there is one.
async function savedDishes(token: string | null): Promise<string[]> {
  if (!token) return [];
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT mi.name_original FROM conversations c JOIN menu_items mi ON mi.kitchen_id = c.kitchen_id
      WHERE c.token = ? ORDER BY mi.id LIMIT 60`,
    [token],
  );
  return rows.map((r) => r.name_original as string);
}

export async function cleanTranscript(text: string, token: string | null): Promise<string> {
  const dishes = await savedDishes(token).catch(() => []);
  client ??= new Anthropic();
  const response = await client.messages.create({
    model: process.env.CLAUDE_FAST_MODEL ?? "claude-haiku-5-5",
    max_tokens: 1000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `${dishes.length ? `Her saved dishes: ${dishes.join(", ")}\n\n` : ""}Dictated text:\n${text}`,
      },
    ],
  });
  const cleaned = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  // A reply that is empty or wildly different in length is treated as a failure: keep what she said.
  if (!cleaned || cleaned.length > text.length * 2 + 40) return text;
  return cleaned;
}
