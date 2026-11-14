import { parseOrder, placeOrder, type OrderErrorCode } from "@/lib/orders";

const STATUS: Record<OrderErrorCode, number> = {
  invalid: 400,
  empty: 400,
  not_found: 404,
  closed: 409,
  sold_out: 409,
  capacity: 409,
};

// Plain code, no agent: validate, then write the order in one transaction.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = parseOrder(body);
  if ("error" in parsed) {
    return Response.json({ ok: false, error: parsed.error }, { status: STATUS[parsed.error] });
  }

  try {
    const result = await placeOrder(parsed.input);
    return Response.json(result, { status: result.ok ? 201 : STATUS[result.error] });
  } catch (error) {
    console.error("Order failed", error);
    return Response.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
