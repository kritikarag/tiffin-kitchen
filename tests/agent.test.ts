// Runs the agent loop against the real database with a scripted stand-in for Claude.
// No API key is needed: each "Claude" reply below is what the real model would plausibly send.
// Run with: npm run test:agent   (needs DATABASE_URL in .env; it creates and deletes its own kitchen)
import assert from "node:assert/strict";

// Always use simulated domain checks, so the test never depends on GoDaddy being reachable.
delete process.env.GODADDY_API_KEY;
delete process.env.GODADDY_API_SECRET;

import { handleOwnerTurn } from "../src/lib/agent";
import { db } from "../src/lib/db";
import { kitchenForToken, ownerOrders } from "../src/lib/ownerOrders";
import { trackOrders } from "../src/lib/track";
import { confirmReceived } from "../src/lib/delivery";
import type { Message, ModelCall, ModelRequest, ModelResponse, ToolResultBlock } from "../src/lib/model";

let seen: ModelRequest[] = [];
let script: ((req: ModelRequest) => ModelResponse)[] = [];

const fakeModel: ModelCall = async (req) => {
  seen.push(structuredClone(req));
  // Translations: one call per language, which the message names on its first line ("Language: kn").
  const language = String(req.messages[0]?.content ?? "").match(/^Language: (\w+)/)?.[1];
  if (req.tools.length === 1 && req.tools[0].name === "save_translations") {
    const names = String(req.messages[0].content).split("\n").slice(2).map((l) => l.replace(/^\d+\. /, ""));
    return { content: [{ type: "tool_use", id: "tr", name: "save_translations",
      input: { dishes: names.map((n) => ({ name: language === "en" ? n : `${n} (${language})`, description: "test" })) } }] };
  }
  // Allergy check: notes mentioning "allerg" are alerts.
  if (req.tools.length === 1 && req.tools[0].name === "save_checks") {
    const checks = String(req.messages[0].content).split("\n").slice(1).map((l) => {
      const [id, ...rest] = l.split(": ");
      return { id: Number(id), alert: /allerg/i.test(rest.join(": ")) };
    });
    return { content: [{ type: "tool_use", id: "nc", name: "save_checks", input: { checks } }] };
  }
  if (req.tools.length === 1 && req.tools[0].name === "save_kitchen_text") {
    return { content: [{ type: "tool_use", id: "kt", name: "save_kitchen_text", input: { name: language === "hi" ? "किचन" : "kitchen", delivery_area: "area" } }] };
  }
  const next = script.shift();
  assert.ok(next, "the agent called the model more times than the test expected");
  return next(req);
};

const say = (text: string) => () => ({ content: [{ type: "text" as const, text }] });
let n = 0;
const call = (name: string, input: unknown) => () => ({ content: [{ type: "tool_use" as const, id: `tu_${++n}`, name, input }] });
const ownerOutcome = (req: ModelRequest) => {
  const m = req.messages[req.messages.length - 1];
  const text = typeof m.content === "string" ? m.content : m.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const match = text.match(/Tool result: ([\s\S]*)\]$/);
  assert.ok(match, `expected the owner's Yes/No outcome, got: ${text}`);
  return JSON.parse(match[1]);
};
const lastResult = (req: ModelRequest) => {
  const m = req.messages[req.messages.length - 1] as Message;
  const blocks = (Array.isArray(m.content) ? m.content : []).filter((b): b is ToolResultBlock => b.type === "tool_result");
  return JSON.parse(blocks[blocks.length - 1].content);
};

// Checks every request is one the real API would accept: roles alternate, and every tool_use is answered
// by a tool_result with the same id in the very next message.
function assertValidConversation(messages: Message[]) {
  assert.equal(messages[0].role, "user");
  for (let i = 1; i < messages.length; i++) assert.notEqual(messages[i].role, messages[i - 1].role, `two ${messages[i].role} turns in a row at ${i}`);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const ids = m.content.filter((b) => b.type === "tool_use").map((b) => (b as { id: string }).id);
    if (ids.length === 0) continue;
    const next = messages[i + 1];
    assert.ok(next, "a tool_use was left without a result");
    const answered = (Array.isArray(next.content) ? next.content : []).filter((b) => b.type === "tool_result").map((b) => (b as ToolResultBlock).tool_use_id);
    assert.deepEqual(answered.sort(), ids.sort());
  }
  // The other direction, which the real API also enforces: a tool_result must answer the message before it.
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "user" || typeof m.content === "string") continue;
    const results = m.content.filter((b) => b.type === "tool_result").map((b) => (b as ToolResultBlock).tool_use_id);
    if (results.length === 0) continue;
    const prev = messages[i - 1];
    const asked = prev?.role === "assistant" ? prev.content.filter((b) => b.type === "tool_use").map((b) => (b as { id: string }).id) : [];
    for (const id of results) assert.ok(asked.includes(id), `tool_result ${id} at message ${i} does not answer the message before it`);
  }
}

async function turn(token: string | null, t: Parameters<typeof handleOwnerTurn>[1]) {
  seen = [];
  const r = await handleOwnerTurn(token, t, fakeModel);
  for (const req of seen) if (req.tools.length > 1) assertValidConversation(req.messages);
  assert.equal(script.length, 0, "not every scripted model reply was used");
  return r;
}

async function main() {
  await db().query("DELETE FROM kitchens WHERE slug LIKE 'test-lakshmi%'");
  const steps: string[] = [];
  const ok = (s: string) => { steps.push(s); console.log(`  ✓ ${s}`); };

  // 1. An interview turn: no tools, just a question back.
  script = [say("ನಮಸ್ಕಾರ! ನೀವು ಏನು ಅಡುಗೆ ಮಾಡುತ್ತೀರಿ?")];
  let r = await turn(null, { type: "message", text: "ನಾನು ಟಿಫಿನ್ ಸರ್ವೀಸ್ ಶುರು ಮಾಡಬೇಕು" });
  assert.equal(r.pending, null);
  assert.ok(seen[0].system.includes("This chat is not linked to a kitchen yet"));
  const token = r.token;
  ok("interview turn returns a question and a conversation token");

  // 2. Claude calls create_kitchen with a bad price: the tool rejects it, Claude fixes it, the call is held.
  const kitchen = { name: "ಲಕ್ಷ್ಮಿ ಟಿಫಿನ್ಸ್", name_latin: "Test Lakshmi Tiffins", owner_language: "kn", delivery_area: "Domlur" }; // no daily limit: it is optional
  script = [
    call("create_kitchen", { ...kitchen, dishes: [{ name: "ಚಪಾತಿ ಪಲ್ಯ", price: -5 }] }),
    (req) => { assert.match(lastResult(req).error, /price/); return call("create_kitchen", { ...kitchen, dishes: [{ name: "ಚಪಾತಿ ಪಲ್ಯ", price: 60 }, { name: "ಅನ್ನ ಸಾಂಬಾರ್", price: 80 }] })(); },
    (req) => { assert.equal(lastResult(req).status, "awaiting_owner_confirmation"); return say("ಎರಡು ತಿನಿಸು ಉಳಿಸಲೇ?")(); },
  ];
  r = await turn(token, { type: "message", text: "ಹೌದು, ಆ ಬೆಲೆ ಸರಿ" });
  assert.equal(r.pending?.name, "create_kitchen");
  const [none] = await db().query("SELECT 1 FROM kitchens WHERE slug LIKE 'test-lakshmi%'");
  assert.equal((none as unknown[]).length, 0, "nothing may be saved before she says yes");
  ok("invalid tool input goes back to Claude as an error, and Claude retries");
  ok("create_kitchen is held: nothing is written before the owner says yes");

  // 3. She says yes: the tool really runs, translations are saved, Claude gets the result.
  script = [(req) => { assert.equal(ownerOutcome(req).saved, true); return say("ಉಳಿಸಿದೆ!")(); }];
  r = await turn(token, { type: "confirm" });
  assert.ok(r.kitchenId);
  const kitchenId = r.kitchenId!;
  const [items] = await db().query("SELECT name_original, translations FROM menu_items WHERE kitchen_id = ? ORDER BY id", [kitchenId]);
  assert.equal((items as unknown[]).length, 2);
  const raw = (items as { translations: unknown }[])[0].translations;
  const tr = typeof raw === "string" ? JSON.parse(raw) : (raw as { kn: { name: string } });
  assert.equal(tr.kn.name, "ಚಪಾತಿ ಪಲ್ಯ (kn)");
  const [kt] = await db().query("SELECT translations FROM kitchens WHERE id = ?", [kitchenId]);
  const kraw = (kt as { translations: unknown }[])[0].translations;
  assert.equal((typeof kraw === "string" ? JSON.parse(kraw) : kraw).hi.name, "किचन");
  ok("on yes, the kitchen and dishes are saved as a draft, with translations");

  // 4. Domains: one taken, one free (simulated without keys), then register is held and she says no.
  script = [
    call("check_domain", { domain: "lt.com" }),
    (req) => { assert.equal(lastResult(req).available, false); return call("check_domain", { domain: "lakshmitiffins.in" })(); },
    (req) => { assert.equal(lastResult(req).available, true); return call("register_domain", { domain: "lakshmitiffins.in" })(); },
    say("lakshmitiffins.in ಖರೀದಿಸಲೇ?"),
  ];
  r = await turn(token, { type: "message", text: "ಹೆಸರು ಹುಡುಕಿ" });
  assert.equal(r.pending?.name, "register_domain");
  script = [(req) => { assert.equal(ownerOutcome(req).status, "cancelled_by_owner"); return say("ಸರಿ, ಬೇರೆ ಹೆಸರು?")(); }];
  r = await turn(token, { type: "cancel" });
  const [k1] = await db().query("SELECT domain, status FROM kitchens WHERE id = ?", [kitchenId]);
  assert.equal((k1 as { domain: string | null }[])[0].domain, null);
  ok("check_domain runs at once and Claude moves on when a name is taken");
  ok("on no, the held action is discarded and nothing changes");

  // 5. Publish is held, then she speaks instead of answering: the action is dropped, conversation stays valid.
  script = [call("publish_site", {}), say("ಪ್ರಕಟಿಸಲೇ?")];
  r = await turn(token, { type: "message", text: "ಪೇಜ್ ಲೈವ್ ಮಾಡಿ" });
  assert.equal(r.pending?.name, "publish_site");
  script = [(req) => { const blocks = req.messages[req.messages.length - 1].content as { type: string; text?: string }[]; assert.equal(blocks.length, 2); assert.match(String(blocks[0].text), /dropped/); assert.equal(blocks[1].type, "text"); return say("ಸರಿ.")(); }];
  r = await turn(token, { type: "message", text: "ಇರಲಿ, ಮೊದಲು ಬೆಲೆ ಹೇಳಿ" });
  assert.equal(r.pending, null);
  ok("speaking instead of answering drops the held action without breaking the conversation");

  // 6. Publish for real, set today's menu, take an order, then get_orders and cancel.
  script = [call("publish_site", {}), say("ಪ್ರಕಟಿಸಲೇ?")];
  await turn(token, { type: "message", text: "ಈಗ ಲೈವ್ ಮಾಡಿ" });
  script = [say("ಲೈವ್ ಆಗಿದೆ!")];
  await turn(token, { type: "confirm" });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const [ids] = await db().query("SELECT id FROM menu_items WHERE kitchen_id = ? ORDER BY id", [kitchenId]);
  const [chapati] = (ids as { id: number }[]).map((x) => x.id);
  script = [call("update_menu", { date: today, cutoff_time: "23:59", dishes: [{ menu_item_id: chapati }, { name: "ಹೊಸ ಪಾಯಸ", price: 40 }] }), say("ಇಂದಿನ ಮೆನು ಸರಿಯೇ?")];
  r = await turn(token, { type: "message", text: "ಇಂದು ಚಪಾತಿ ಮತ್ತು ಪಾಯಸ, ಹನ್ನೊಂದು ಗಂಟೆಯವರೆಗೆ" });
  assert.deepEqual(r.pending?.summary.dishes, [{ name: "ಚಪಾತಿ ಪಲ್ಯ", price: 60 }, { name: "ಹೊಸ ಪಾಯಸ", price: 40 }]);
  script = [say("ಮೆನು ಹಾಕಿದೆ.")];
  await turn(token, { type: "confirm" });
  const [slugRow] = await db().query("SELECT slug FROM kitchens WHERE id = ?", [kitchenId]);
  const { parseOrder, placeOrder } = await import("../src/lib/orders");
  const parsed = parseOrder({ slug: (slugRow as { slug: string }[])[0].slug, idempotencyKey: "test-key-123", customerName: "Ravi", phone: "9876543210", area: "Domlur", address: "12, 2nd Cross, Domlur", note: "காரம் குறைவாக", items: [{ menuItemId: chapati, quantity: 3 }] });
  assert.ok("input" in parsed);
  // An order without a full address is refused: the area alone isn't enough to deliver.
  assert.deepEqual(parseOrder({ slug: "x", idempotencyKey: "test-key-noaddr", customerName: "Ravi", phone: "9876543210", area: "Domlur", items: [{ menuItemId: 1, quantity: 1 }] }), { error: "invalid" });
  const placed = await placeOrder(parsed.input);
  assert.ok(placed.ok);
  assert.equal(placed.upiUri, null); // no UPI ID yet, so no QR code
  const boxesOf = async (phone: string) => {
    const [rows] = await db().query("SELECT pending_boxes FROM customer_boxes WHERE kitchen_id = ? AND customer_phone = ?", [kitchenId, phone]);
    return Number((rows as { pending_boxes: number }[])[0]?.pending_boxes ?? 0);
  };
  assert.equal(await boxesOf("9876543210"), 1); // one dabba per order, not per plate
  ok("publish and update_menu work end to end; a customer order goes through");

  script = [
    call("get_orders", {}),
    (req) => { const d = lastResult(req); assert.equal(d.order_count, 1); assert.equal(d.portions, 3); assert.equal(d.orders[0].note, "காரம் குறைவாக"); return call("cancel_order", { order_id: d.orders[0].order_id })(); },
    say("ರವಿ ಅವರ ಆರ್ಡರ್ ರದ್ದು ಮಾಡಲೇ?"),
  ];
  r = await turn(token, { type: "message", text: "ರವಿ ಆರ್ಡರ್ ರದ್ದು ಮಾಡಿ" });
  assert.equal(r.pending?.name, "cancel_order");
  script = [say("ರದ್ದಾಗಿದೆ.")];
  await turn(token, { type: "confirm" });
  const [o] = await db().query("SELECT status FROM orders WHERE id = ?", [placed.ok ? placed.orderId : 0]);
  assert.equal((o as { status: string }[])[0].status, "cancelled");
  assert.equal(await boxesOf("9876543210"), 0); // the cancelled order's dabba never went out
  ok("get_orders returns exact totals; cancel_order is held and runs on yes");

  // UPI ID, held until yes; then orders come back with a UPI payment link for the exact amount.
  script = [call("update_kitchen_details", { upi_id: "Test.Cook@okaxis" }), say("UPI ID test.cook@okaxis ಹಾಕಲೇ?")];
  r = await turn(token, { type: "message", text: "ನನ್ನ UPI test.cook@okaxis" });
  assert.equal(r.pending?.name, "update_kitchen_details");
  script = [say("ಆಯಿತು.")];
  await turn(token, { type: "confirm" });
  const [upiRow] = await db().query("SELECT upi_id FROM kitchens WHERE id = ?", [kitchenId]);
  assert.equal((upiRow as { upi_id: string }[])[0].upi_id, "test.cook@okaxis");
  const slug = (slugRow as { slug: string }[])[0].slug;
  const order = (key: string, name: string, phone: string, note: string) =>
    parseOrder({ slug, idempotencyKey: key, customerName: name, phone, area: "Domlur", address: "Flat 2, Lake Road, Domlur", note, items: [{ menuItemId: chapati, quantity: 2 }] });
  const withAllergy = order("test-key-allergy", "Priya", "9123456780", "Peanut allergy, please be careful");
  const plain = order("test-key-plain", "Meera", "9811122233", "less oil");
  assert.ok("input" in withAllergy && "input" in plain);
  const paid = await placeOrder(withAllergy.input);
  await placeOrder(plain.input);
  assert.ok(paid.ok && paid.upiUri?.startsWith("upi://pay?pa=test.cook%40okaxis") && paid.upiUri.includes("am=120"));
  assert.ok(paid.ok && /^\/track\/[A-Za-z0-9_-]{16}$/.test(paid.trackPath ?? ""));
  ok("update_kitchen_details is held until yes; orders then carry a UPI link for the exact amount");

  // get_orders checks new notes: only the allergy is flagged. Dabbas come back by voice, with no yes needed.
  script = [
    call("get_orders", {}),
    (req) => {
      const d = lastResult(req);
      const byName = Object.fromEntries(d.orders.map((o: { customer_name: string }) => [o.customer_name, o]));
      assert.equal(byName.Priya.allergy_alert, true);
      assert.equal(byName.Meera.allergy_alert, false);
      assert.equal(byName.Priya.dabbas_with_customer, 1);
      assert.equal(d.allergy_alerts, 1);
      return call("update_customer_boxes", { action: "returned", customer: "Priya" })();
    },
    (req) => { const d = lastResult(req); assert.equal(d.returned, 1); assert.equal(d.boxes_left, 0); return say("ಸರಿ.")(); },
  ];
  r = await turn(token, { type: "message", text: "ಪ್ರಿಯಾ ಡಬ್ಬಿ ವಾಪಸ್ ಕೊಟ್ರು" });
  assert.equal(r.pending, null);
  assert.equal(await boxesOf("9123456780"), 0);
  assert.equal(await boxesOf("9811122233"), 1);
  ok("allergy notes are flagged and dabbas are marked returned at once");

  // Delivery: marked by area at once, shown in get_orders, and the owner screen offers a WhatsApp message to the customer.
  script = [call("mark_delivery", { status: "preparing", all: true }), say("ಸರಿ.")];
  await turn(token, { type: "message", text: "ಅಡುಗೆ ಶುರು ಮಾಡಿದೆ" });
  script = [call("mark_delivery", { status: "on_the_way", area: "Domlur" }), say("ಸರಿ.")];
  r = await turn(token, { type: "message", text: "ಡೊಮ್ಲೂರ್ ಆರ್ಡರ್ ಹೊರಟಿವೆ" });
  assert.equal(r.pending, null);
  const [dl] = await db().query("SELECT delivery FROM orders o JOIN daily_menus dm ON dm.id = o.daily_menu_id WHERE dm.kitchen_id = ? AND o.status = 'placed'", [kitchenId]);
  assert.ok((dl as { delivery: string }[]).every((o) => o.delivery === "on_the_way"));
  const view = await ownerOrders((await kitchenForToken(token))!, undefined, "kn");
  const priya = view!.orders.find((o) => o.customerName === "Priya")!;
  assert.equal(priya.delivery, "on_the_way");
  assert.ok(priya.tell.delivered.startsWith("https://wa.me/919123456780?text="));
  assert.ok(decodeURIComponent(priya.tell.on_the_way).includes("/track/")); // the message carries her tracking link
  const code = priya.tell.on_the_way.match(/track%2F([A-Za-z0-9_-]{16})/)?.[1] ?? decodeURIComponent(priya.tell.on_the_way).match(/track\/([A-Za-z0-9_-]{16})/)![1];
  const [mine] = await trackOrders([code, "not-a-real-code!"], "en");
  assert.equal(mine.delivery, "on_the_way");
  assert.equal(mine.current, true);
  assert.equal((await trackOrders(["AAAAAAAAAAAAAAAA"], "en")).length, 0); // an unknown code shows nothing
  // The customer, not the cook, confirms the tiffin arrived; the cook's screen shows who confirmed it.
  assert.equal(await confirmReceived(code), true);
  assert.equal(await confirmReceived(code), false); // a second tap changes nothing
  const [arrived] = await trackOrders([code], "en");
  assert.ok(arrived.delivery === "delivered" && arrived.receivedByCustomer && !arrived.current);
  const after = await ownerOrders((await kitchenForToken(token))!, undefined, "kn");
  assert.equal(after.orders.find((o) => o.customerName === "Priya")!.deliveredBy, "customer");
  ok("mark_delivery marks orders preparing, then on the way by area; the customer sees it in My orders, confirms it arrived, and her WhatsApp message has her tracking link");

  // 7. mark_sold_out runs at once, no confirmation.
  script = [call("mark_sold_out", { menu_item_id: chapati }), say("ಸರಿ.")];
  r = await turn(token, { type: "message", text: "ಚಪಾತಿ ಮುಗಿದಿದೆ" });
  assert.equal(r.pending, null);
  const [so] = await db().query("SELECT sold_out FROM daily_menu_items WHERE menu_item_id = ?", [chapati]);
  assert.equal(Number((so as { sold_out: number }[])[0].sold_out), 1);
  ok("mark_sold_out runs at once");

  // 8. A model that never stops calling tools hits the round limit and the conversation stays valid.
  script = Array.from({ length: 8 }, () => call("get_orders", {}));
  r = await turn(token, { type: "message", text: "ಎಷ್ಟು ಆರ್ಡರ್?" });
  assert.match(r.reply, /could not finish/);
  script = [say("ಸರಿ.")];
  await turn(token, { type: "message", text: "ಮತ್ತೆ" });
  ok("the loop stops after 8 rounds and the next turn still works");

  await db().query("DELETE FROM kitchens WHERE id = ?", [kitchenId]);
  await db().query("DELETE FROM conversations WHERE token = ?", [token]);
  console.log(`\nAll ${steps.length} checks passed.`);
  await db().end();
}

main().catch(async (error) => {
  console.error(error);
  await db().end();
  process.exit(1);
});
