import type { AgentStep } from "@/lib/agent";
import { fill, labelsFor, type Lang } from "@/lib/i18n";
import styles from "./owner.module.css";
import { STEP_LABELS, type StepWords } from "./stepLabels";

// Shows what the agent actually did this turn, above its reply: each tool call, whether it ran or is waiting
// for her Yes, and which system did the work. The facts come from the tool results, not from Claude's wording.

type Info = AgentStep["info"];

// One line of text for a step, chosen from the templates by what the tool returned.
function describe(w: StepWords, tool: string, i: Info): string | null {
  const v = Object.fromEntries(Object.entries(i).map(([k, x]) => [k, x == null ? "" : String(x)]));
  switch (tool) {
    case "check_domain":
      return fill(i.available ? w.check_domain_free : w.check_domain_taken, v);
    case "register_domain":
      return fill(w.register_domain, v);
    case "create_kitchen":
      return fill(i.dishes ? w.create_kitchen_dishes : w.create_kitchen, v);
    case "publish_site":
      return w.publish_site;
    case "update_menu":
      if (i.holiday) return fill(w.update_menu_holiday, v);
      return fill(i.dishes ? w.update_menu_dishes : w.update_menu, v) + (i.cutoff ? fill(w.update_menu_cutoff, v) : "");
    case "mark_sold_out":
      return i.soldOut ? w.sold_out : w.back_on_sale;
    case "get_orders":
      return fill(w.get_orders, v);
    case "cancel_order":
      return i.customer ? fill(w.cancel_order, v) : w.cancel_order_unnamed;
    case "mark_delivery":
      return fill(i.status === "delivered" ? w.delivery_delivered : i.status === "on_the_way" ? w.delivery_on_the_way : i.status === "preparing" ? w.delivery_preparing : w.delivery_waiting, v);
    case "update_customer_boxes":
      if (i.action === "returned") return fill(w.boxes_returned, v);
      if (i.action === "check") return fill(w.boxes_check, v);
      return fill(w.boxes_list, v);
    case "update_kitchen_details":
      return i.whatsapp && i.upi ? w.details_both : i.whatsapp ? w.details_whatsapp : i.upi ? w.details_upi : w.details_other;
    default:
      return null;
  }
}

// Which system did the work: shown as a small tag, so the agent's use of real services is visible.
const SOURCE: Record<string, (i: Info) => string> = {
  check_domain: (i) => (i.simulated ? "GoDaddy · test" : "GoDaddy"),
  register_domain: (i) => (i.simulated ? "GoDaddy · test" : "GoDaddy"),
  create_kitchen: () => "Claude + database",
  publish_site: () => "Hosting",
  update_menu: () => "Database",
  mark_sold_out: () => "Database",
  get_orders: () => "Database",
  cancel_order: () => "Database",
  mark_delivery: () => "Database",
  update_customer_boxes: () => "Database",
  update_kitchen_details: () => "Database",
};

const ICON = { done: "✓", waiting: "⏳", cancelled: "✕", failed: "!" };

export default function AgentSteps({ steps, lang }: { steps: AgentStep[]; lang: Lang }) {
  const w = labelsFor<StepWords>(STEP_LABELS, "steps", lang);
  const shown = steps.map((s) => ({ ...s, text: describe(w, s.tool, s.info) })).filter((s) => s.text);
  if (shown.length === 0) return null;
  return (
    <div className={styles.steps}>
      <span className={styles.stepsHeading}>{w.heading}</span>
      <ol>
        {shown.map((s, i) => (
          <li key={i} className={styles[`step_${s.status}`]}>
            <span className={styles.stepIcon} aria-hidden="true">
              {ICON[s.status]}
            </span>
            <span className={styles.stepText}>
              {s.text}
              {s.status !== "done" && <em> · {w[s.status]}</em>}
            </span>
            <span className={styles.stepSource}>{SOURCE[s.tool]?.(s.info)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
