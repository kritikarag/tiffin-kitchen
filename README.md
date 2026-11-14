# Tiffin

Voice-first tiffin kitchen for the GoDaddy Inclusive Innovation Hackathon 2026.

This is stage 1: the customer side. It has the database schema, the public menu page and the order API. The owner dashboard, the tools and the agent loop come next.

## Run it locally

You need Node.js 22 or later and a MySQL (or MariaDB) database.

```bash
npm install
cp .env.example .env      # then put your database details in .env
npm run db:migrate        # creates the tables
npm run db:seed           # adds a demo kitchen with today's menu
npm run dev
```

Open http://localhost:3000/k/ammas-kitchen

The seed sets the cut-off to 22:00 so the page stays open while you test. To try another time: `SEED_CUTOFF=11:00 npm run db:seed`. Running the seed again resets the demo kitchen and its orders.

## What is where

| Path | What it does |
| --- | --- |
| `schema.sql` | The seven tables |
| `scripts/` | `migrate.mjs` applies the schema, `seed.mjs` adds the demo kitchen |
| `src/lib/db.ts` | Database connection pool |
| `src/lib/time.ts` | "Today" and "now" in the kitchen's time zone, cut-off check |
| `src/lib/i18n.ts` | Languages, fixed labels, language choice |
| `src/lib/menu.ts` | Reads today's menu for the page |
| `src/lib/orders.ts` | Validates and saves an order in one transaction |
| `src/app/api/orders/route.ts` | `POST /api/orders` |
| `src/app/k/[slug]/` | The public menu page, language switch and order form |

## Rules the order API enforces

- The kitchen must be live and have an open menu for today.
- The cut-off is compared with the current time in the kitchen's time zone.
- A sold-out dish, or a dish not on today's menu, is rejected.
- `capacity_per_day` is the total number of portions across all orders for the day.
- The same `idempotencyKey` always returns the same order, so a double tap creates one order.

Prices are whole rupees. The price of a dish on a given day is stored in `daily_menu_items.price`.

## Adding a language

Add it to `LANGUAGES` in `src/lib/i18n.ts` and add one dictionary of labels in the same file. Dish names come from `menu_items.translations`.
