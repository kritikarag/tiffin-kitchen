import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { db, parseJson } from "./db";
import type { ImageBlock, Message, ModelCall, TextBlock, ToolResultBlock, ToolUseBlock } from "./model";
import { needsConfirmation, runTool, toolDefinitions } from "./tools";
import { nowInZone } from "./time";

// The agent loop in one sentence: send the conversation to Claude; if Claude asks for tools, run them,
// add the results to the conversation and ask again; stop when Claude answers in plain text.

const MAX_ROUNDS = 8; // a safety stop so a confused model cannot loop forever
const MAX_STORED_MESSAGES = 40; // older turns are dropped so each request stays small

export type PendingAction = { toolUseId: string; name: string; input: unknown; summary: Record<string, unknown> };

// One visible step of the agent's work, shown to the owner above its reply ("✓ Checked lakshmitiffins.in").
// `info` holds the few facts the page needs to word the step in her language.
export type AgentStep = {
  tool: string;
  status: "done" | "waiting" | "cancelled" | "failed";
  info: Record<string, string | number | boolean | null>;
};

export type AgentReply = {
  token: string; // the dashboard keeps this to continue the same conversation
  reply: string; // what to show and speak to the owner
  steps: AgentStep[]; // what the agent did this turn, in order
  pending: { name: string; summary: Record<string, unknown> } | null; // when set, show Yes/No buttons
  kitchenId: number | null;
};

// "yes" and "no" arrive as their own turn types so the confirmation never depends on reading free text.
export type OwnerTurn = (
  | { type: "message"; text: string; image?: ImageBlock["source"] }
  | { type: "confirm" }
  | { type: "cancel" }
) & { screenLanguage?: "kn" | "hi" | "en" }; // the language she picked on the owner page

const SYSTEM_PROMPT = `You are the assistant for a woman starting or running a home tiffin service in India.
She speaks to you by voice and hears your replies read aloud. She may not read comfortably.

How to talk:
- Always reply in the language she uses. If she mixes languages, reply the way she speaks.
- Keep replies short: two or three sentences that sound natural when spoken. No lists, tables, markdown or emoji.
- Ask one question at a time.
- Say prices as rupees in words a listener follows, such as "eighty rupees".

Launching a new kitchen (when there is no kitchen yet):
1. Ask for her dishes and her price for each, where she delivers, and how many people she can feed in a day. One question per turn. If she gives several answers at once, take them all.
2. The menu and prices are hers. Write down exactly what she says. Do not suggest dishes or prices, and do not change hers.
3. Only if she asks for help, or says she is unsure what to cook or charge: ask roughly what one plate costs her, then suggest dishes or prices that cover her costs with a fair margin, and let her choose.
4. If she has not named her kitchen, ask what to call it.
5. Ask for her WhatsApp number, so customers can send her their orders there. It is optional; if she would rather not share it, go on without it.
6. Read back her menu, prices, areas and daily capacity in one short sentence, then call create_kitchen.
7. Suggest two or three web addresses based on her kitchen's name. Call check_domain for each and offer only the free ones.
8. When she picks one, call register_domain. Then call publish_site.
9. Finish by writing a short WhatsApp message in her language announcing her kitchen.

Photos of a menu:
- She may send a photo of her menu, often handwritten. Read every dish and price exactly as written. Do not add, drop or round anything.
- List what you read back to her in one or two sentences and ask if it is right. If a dish or price is unclear, say which one and ask her; never guess a price.
- Then use what she confirms: create_kitchen for a new kitchen, or update_menu for a day's menu.

Running a live kitchen:
- Use update_menu for the day's menu, cut-off time or a holiday. Use the menu_item_id of saved dishes.
- Use mark_sold_out when a dish runs out.
- Use get_orders for any question about orders. Never state counts or totals you did not get from get_orders.
- To cancel an order, find it with get_orders. If more than one order could match, ask which one.
- After cut-off, give her the cooking list: totals per dish, special requests (translated into her language) and deliveries grouped by area.

Rules:
- Some tools are held until she says yes. When a tool result says "awaiting_owner_confirmation", read the action back in one sentence and ask her to confirm. Do not say it is done.
- Never invent orders, prices, dishes or domain results.
- If a domain result says "simulated": true, say the name is reserved for her, not bought or registered.
- If a tool returns an error, fix your request or ask her, in plain words.`;

// Facts that change every turn go in the system prompt, so Claude always knows today's date and the state.
async function contextBlock(kitchenId: number | null): Promise<string> {
  if (kitchenId == null) return "There is no kitchen yet. Help her launch one.";
  const [kitchens] = await db().query<RowDataPacket[]>("SELECT * FROM kitchens WHERE id = ?", [kitchenId]);
  const k = kitchens[0];
  if (!k) return "There is no kitchen yet. Help her launch one.";
  const now = nowInZone(k.timezone);
  const [dishes] = await db().query<RowDataPacket[]>("SELECT id, name_original, price FROM menu_items WHERE kitchen_id = ? ORDER BY id", [k.id]);
  const [menus] = await db().query<RowDataPacket[]>(
    "SELECT dm.status, dm.cutoff_time, mi.name_original, dmi.price, dmi.sold_out FROM daily_menus dm " +
      "LEFT JOIN daily_menu_items dmi ON dmi.daily_menu_id = dm.id LEFT JOIN menu_items mi ON mi.id = dmi.menu_item_id " +
      "WHERE dm.kitchen_id = ? AND dm.menu_date = ?",
    [k.id, now.date],
  );
  const today = menus.length
    ? menus[0].status === "holiday"
      ? "holiday"
      : `${menus[0].status}, cut-off ${String(menus[0].cutoff_time).slice(0, 5)}: ` +
        menus.map((m) => `${m.name_original} ₹${m.price}${m.sold_out ? " (sold out)" : ""}`).join(", ")
    : "not set yet";
  return [
    `Kitchen: ${k.name} (status ${k.status}, page /k/${k.slug}${k.domain ? `, domain ${k.domain}` : ""}).`,
    `Delivers to: ${k.delivery_area}. Capacity: ${k.capacity_per_day ?? "no limit"} portions a day.`,
    `Today is ${now.date}, time ${now.time.slice(0, 5)} (${k.timezone}).`,
    `Saved dishes: ${dishes.map((d) => `[${d.id}] ${d.name_original} ₹${d.price}`).join(", ") || "none"}.`,
    `Today's menu: ${today}.`,
  ].join("\n");
}

// ---- conversation storage -------------------------------------------------------------------------

type Conversation = { id: number | null; token: string; kitchenId: number | null; messages: Message[]; pending: PendingAction | null };

async function loadConversation(token: string | null): Promise<Conversation> {
  if (token) {
    const [rows] = await db().query<RowDataPacket[]>("SELECT * FROM conversations WHERE token = ?", [token]);
    if (rows[0]) {
      return {
        id: rows[0].id,
        token,
        kitchenId: rows[0].kitchen_id,
        messages: parseJson<Message[]>(rows[0].messages, []),
        pending: parseJson<PendingAction | null>(rows[0].pending_action, null),
      };
    }
  }
  return { id: null, token: randomUUID(), kitchenId: null, messages: [], pending: null };
}

// Keeps the newest messages, but always starts on a plain user message. Starting on a tool result would
// break the pairing between a tool_use and its tool_result, and Claude's API rejects that.
function trim(messages: Message[]): Message[] {
  if (messages.length <= MAX_STORED_MESSAGES) return messages;
  let start = messages.length - MAX_STORED_MESSAGES;
  const isFreshUserTurn = (m: Message) =>
    m.role === "user" && (typeof m.content === "string" || !m.content.some((b) => b.type === "tool_result"));
  while (start < messages.length && !isFreshUserTurn(messages[start])) start++;
  return messages.slice(start);
}

// Photos are large, so stored history keeps only a note that one was sent. Claude already wrote down what
// it read from the photo in its reply, which stays in the history.
function withoutImages(messages: Message[]): Message[] {
  return messages.map((m) =>
    m.role === "user" && typeof m.content !== "string" && m.content.some((b) => b.type === "image")
      ? { ...m, content: m.content.map((b) => (b.type === "image" ? { type: "text" as const, text: "[A photo was shared here.]" } : b)) }
      : m,
  );
}

async function saveConversation(c: Conversation): Promise<void> {
  const messages = JSON.stringify(trim(withoutImages(c.messages)));
  const pending = c.pending ? JSON.stringify(c.pending) : null;
  if (c.id == null) {
    await db().query("INSERT INTO conversations (token, kitchen_id, messages, pending_action) VALUES (?, ?, ?, ?)", [c.token, c.kitchenId, messages, pending]);
  } else {
    await db().query("UPDATE conversations SET kitchen_id = ?, messages = ?, pending_action = ? WHERE id = ?", [c.kitchenId, messages, pending, c.id]);
  }
}

// Without words (a photo alone, or a Yes tap), Claude can't tell her language and may copy the menu's.
const LANGUAGE_NAMES = { kn: "Kannada", hi: "Hindi", en: "English" } as const;
function screenLanguageNote(lang: OwnerTurn["screenLanguage"]): string {
  return lang ? `\nShe has chosen ${LANGUAGE_NAMES[lang]} on her screen. Reply in ${LANGUAGE_NAMES[lang]} unless she speaks to you in another language.` : "";
}

// The facts worth showing for a tool step. Values come from the tool's own input and result, not from Claude's words.
function stepInfo(name: string, input: unknown, data: unknown): AgentStep["info"] {
  const i = (input ?? {}) as Record<string, unknown>;
  const d = (data ?? {}) as Record<string, unknown>;
  const count = (v: unknown) => (Array.isArray(v) ? v.length : null);
  switch (name) {
    case "check_domain":
      return { domain: String(d.domain ?? i.domain ?? ""), available: d.available === true, simulated: d.simulated === true };
    case "register_domain":
      return { domain: String(d.domain ?? i.domain ?? ""), simulated: d.simulated !== false };
    case "create_kitchen":
      return { name: String(d.name ?? i.name ?? ""), dishes: count(d.dishes) ?? count(i.dishes) };
    case "publish_site":
      return { page: String(d.page_path ?? "") };
    case "update_menu":
      return { date: String(d.date ?? i.date ?? ""), holiday: i.holiday === true || d.status === "holiday", dishes: count(d.dishes) ?? count(i.dishes), cutoff: String(d.cutoff_time ?? i.cutoff_time ?? "") };
    case "mark_sold_out":
      return { soldOut: i.sold_out !== false };
    case "get_orders":
      return { orders: Number(d.order_count ?? 0), plates: Number(d.portions ?? 0) };
    case "cancel_order":
      return { customer: String(d.customer_name ?? "") };
    default:
      return {};
  }
}

// How her Yes or No reaches Claude. "Tool result:" is followed by JSON so it can be read back reliably.
function ownerAnswer(name: string, yes: boolean, result: { ok: boolean; data: unknown }): string {
  const what = yes ? (result.ok ? `She tapped Yes and ${name} ran.` : `She tapped Yes but ${name} failed.`) : `She tapped No, so ${name} did not run.`;
  return `[${what} Tool result: ${JSON.stringify(result.data)}]`;
}

const asResult = (toolUseId: string, ok: boolean, data: unknown): ToolResultBlock => ({
  type: "tool_result",
  tool_use_id: toolUseId,
  content: JSON.stringify(data),
  ...(ok ? {} : { is_error: true }),
});

// ---- the loop ------------------------------------------------------------------------------------

export async function handleOwnerTurn(token: string | null, turn: OwnerTurn, model: ModelCall): Promise<AgentReply> {
  const convo = await loadConversation(token);

  const steps: AgentStep[] = [];

  // Step 1: turn what the owner did into the next user message.
  if (convo.pending && turn.type !== "message") {
    // She answered a held action with Yes or No. Only now does the real tool run.
    const action = convo.pending;
    convo.pending = null;
    const result =
      turn.type === "confirm"
        ? await runTool(action.name, action.input, { kitchenId: convo.kitchenId, model })
        : { ok: true, data: { status: "cancelled_by_owner", note: "Nothing was changed." } };
    if (result.kitchenId != null) convo.kitchenId = result.kitchenId;
    steps.push({ tool: action.name, status: turn.type !== "confirm" ? "cancelled" : result.ok ? "done" : "failed", info: stepInfo(action.name, action.input, turn.type === "confirm" ? result.data : action.summary) });
    // The original tool_use was already answered ("awaiting_owner_confirmation") in an earlier turn, and
    // Claude has replied since. A tool_result may only follow its own tool_use, so the outcome comes back
    // as an ordinary user message instead.
    convo.messages.push({ role: "user", content: ownerAnswer(action.name, turn.type === "confirm", result) });
  } else if (turn.type === "message") {
    const words = turn.text.trim().slice(0, 2000);
    // A photo goes in as an image block next to her words. It is sent to Claude for this turn only;
    // saveConversation replaces it with a short note so it isn't stored or resent on every later turn.
    const text: Message["content"] = turn.image
      ? [
          { type: "image", source: turn.image },
          { type: "text", text: words || "[She sent a photo of her menu.]" },
        ]
      : words;
    if (convo.pending) {
      // She said something else instead of answering. The held action is dropped, and Claude is told.
      convo.messages.push({
        role: "user",
        content: `[She did not answer the held ${convo.pending.name} action, so it was dropped and nothing was changed.]`,
      });
      convo.pending = null;
      convo.messages.push({ role: "user", content: text });
    } else {
      convo.messages.push({ role: "user", content: text });
    }
  } else {
    return { token: convo.token, reply: "", steps: [], pending: null, kitchenId: convo.kitchenId }; // stale button press
  }
  convo.messages = mergeUserMessages(convo.messages);

  // Step 2: the loop.
  let reply = "";
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await model({
      system: `${SYSTEM_PROMPT}\n\nCurrent state:\n${await contextBlock(convo.kitchenId)}${screenLanguageNote(turn.screenLanguage)}`,
      messages: convo.messages,
      tools: toolDefinitions,
    });
    // Only text and tool calls count as an answer; thinking alone (for example when Claude runs out of
    // tokens) is not stored, because the fallback below then closes the turn instead.
    const answered = response.content.some((b) => (b.type === "text" && b.text) || b.type === "tool_use");
    if (!answered) break;
    convo.messages.push({ role: "assistant", content: response.content });

    const calls = response.content.filter((b): b is ToolUseBlock => b.type === "tool_use");
    if (calls.length === 0) {
      // No tool requested: this is Claude's answer to the owner.
      reply = response.content.filter((b): b is TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      break;
    }

    // Every tool_use must get exactly one tool_result in the next message, or the API rejects the request.
    const results: ToolResultBlock[] = [];
    for (const call of calls) {
      if (needsConfirmation(call.name) && !convo.pending) {
        // Held: check the input without changing anything, and keep the call until she answers.
        const check = await runTool(call.name, call.input, { kitchenId: convo.kitchenId, model, dryRun: true });
        if (check.ok) {
          convo.pending = { toolUseId: call.id, name: call.name, input: call.input, summary: check.data };
          steps.push({ tool: call.name, status: "waiting", info: stepInfo(call.name, call.input, check.data) });
          results.push(asResult(call.id, true, { status: "awaiting_owner_confirmation", will_do: check.data }));
        } else {
          results.push(asResult(call.id, false, check.data)); // bad input: let Claude fix it first
        }
      } else if (needsConfirmation(call.name)) {
        // Only one action can wait for a yes at a time.
        results.push(asResult(call.id, false, { error: "Another action is waiting for her answer. Ask about that one first." }));
      } else {
        const result = await runTool(call.name, call.input, { kitchenId: convo.kitchenId, model });
        results.push(asResult(call.id, result.ok, result.data));
        // A failed step is shown only for real problems; input Claude corrects on its own stays out of sight.
        if (result.ok) steps.push({ tool: call.name, status: "done", info: stepInfo(call.name, call.input, result.data) });
      }
    }
    convo.messages.push({ role: "user", content: results });
  }

  if (!reply) {
    reply = "Sorry, I could not finish that. Please say it again in a few words.";
    // Close the conversation on an assistant turn so the next request is valid, without ever storing two
    // assistant turns in a row.
    const last = convo.messages[convo.messages.length - 1];
    if (last?.role === "assistant" && !last.content.some((b) => b.type === "tool_use")) {
      last.content = [...last.content, { type: "text", text: reply }];
    } else {
      convo.messages.push({ role: "assistant", content: [{ type: "text", text: reply }] });
    }
    convo.pending = null;
  }

  await saveConversation(convo);
  return {
    token: convo.token,
    reply,
    steps,
    pending: convo.pending ? { name: convo.pending.name, summary: convo.pending.summary } : null,
    kitchenId: convo.kitchenId,
  };
}

// Claude's API wants user and assistant turns to alternate. A tool result followed by her new words would
// be two user messages in a row, so they are merged into one.
function mergeUserMessages(messages: Message[]): Message[] {
  const out: Message[] = [];
  for (const m of messages) {
    const last = out[out.length - 1];
    if (last && last.role === "user" && m.role === "user") {
      const toBlocks = (c: string | (TextBlock | ImageBlock | ToolResultBlock)[]) => (typeof c === "string" ? [{ type: "text" as const, text: c }] : c);
      out[out.length - 1] = { role: "user", content: [...toBlocks(last.content), ...toBlocks(m.content)] };
    } else {
      out.push(m);
    }
  }
  return out;
}
