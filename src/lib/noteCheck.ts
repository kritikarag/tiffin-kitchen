import type { RowDataPacket } from "mysql2";
import { db } from "./db";
import type { ModelCall } from "./model";

// Flags customer notes about allergies and health: "peanut allergy", "मूंगफली से एलर्जी", "diabetic, no sugar".
// A note written in Tamil may be read by a cook who reads Kannada, so a dangerous note must stand out
// whatever language it is in. Claude decides, once per note, and the answer is saved on the order.
//
// This is a help, never a guarantee. Every note is always shown in full; a note that is not flagged is shown
// normally, never hidden. The check runs when the owner reads her orders, not when the customer orders,
// so ordering stays free of AI.

const SYSTEM =
  "You check notes that customers wrote on home tiffin orders in India, in any language. Mark a note as an alert " +
  "ONLY when it is about safety or health: a food allergy or intolerance (nuts, peanuts, gluten, dairy, shellfish, " +
  "eggs), a medical diet (diabetic, no sugar for health, low salt for blood pressure, kidney diet), or a strict " +
  "exclusion that would harm or seriously upset the eater (no egg for a strict vegetarian, no meat, Jain food). " +
  "Taste and convenience are NOT alerts: less spicy, less oil, extra chutney, no onion as a preference, ring the " +
  "bell, deliver early. If unsure whether it is about safety or health, mark it as an alert.";

type Check = { id: number; alert: boolean };

export async function checkNotes(model: ModelCall, notes: { id: number; note: string }[]): Promise<Check[]> {
  if (notes.length === 0) return [];
  const response = await model({
    fast: true,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          "Check each note, then call save_checks with every id.\n" +
          notes.map((n) => `${n.id}: ${JSON.stringify(n.note)}`).join("\n"),
      },
    ],
    tools: [
      {
        name: "save_checks",
        description: "Save, for every note id, whether it is a safety or health alert.",
        input_schema: {
          type: "object",
          properties: {
            checks: {
              type: "array",
              items: {
                type: "object",
                properties: { id: { type: "integer" }, alert: { type: "boolean" } },
                required: ["id", "alert"],
              },
            },
          },
          required: ["checks"],
        },
      },
    ],
    maxTokens: 2000,
  });
  const call = response.content.find((b) => b.type === "tool_use");
  const checks = (call && "input" in call ? (call.input as { checks?: unknown }).checks : null) ?? [];
  const asked = new Set(notes.map((n) => n.id));
  return (Array.isArray(checks) ? checks : [])
    .filter((c): c is Check => typeof c?.id === "number" && typeof c?.alert === "boolean" && asked.has(c.id));
}

// Checks every note on this day's menu that hasn't been checked yet, and saves the answers.
// If Claude can't be reached the notes stay unchecked and are shown normally; the next view tries again.
export async function checkMenuNotes(model: ModelCall, dailyMenuId: number): Promise<void> {
  const [rows] = await db().query<RowDataPacket[]>(
    "SELECT id, note_original FROM orders WHERE daily_menu_id = ? AND note_original IS NOT NULL AND note_original <> '' AND allergy_alert IS NULL LIMIT 100",
    [dailyMenuId],
  );
  if (rows.length === 0) return;
  try {
    const checks = await checkNotes(model, rows.map((r) => ({ id: r.id, note: r.note_original })));
    for (const c of checks) await db().query("UPDATE orders SET allergy_alert = ? WHERE id = ?", [c.alert, c.id]);
  } catch (error) {
    console.error("Note check failed; notes are shown without alerts for now.", error);
  }
}
