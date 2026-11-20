# Tiffin: a voice-first assistant for home kitchens

**Built for the GoDaddy Inclusive Innovation Hackathon 2026 with Claude and GoDaddy.**

A woman who cooks well can start a home tiffin service by talking to an assistant in her own language. One conversation gives her a menu with sensible prices, a web address and a live ordering page. After that, she runs the business the same way, by speaking: today's menu, a dish that sold out, a cancelled order, and at cut-off a cooking list telling her exactly what to make and where it goes.

Her customers open a link shared on WhatsApp, read the menu in their own language and order in a few taps, with no app and no account.

| The owner talks to it in Kannada | A customer orders in Hindi |
| --- | --- |
| ![Owner chat in Kannada](docs/owner-voice-kannada.png) | ![Customer menu in Hindi](docs/customer-page-hindi.png) |

---

## Contents

1. [The problem](#1-the-problem)
2. [Who it is for](#2-who-it-is-for)
3. [What it does](#3-what-it-does)
4. [A walkthrough: Lakshmi's first day](#4-a-walkthrough-lakshmis-first-day)
5. [How it works](#5-how-it-works)
6. [Design decisions](#6-design-decisions)
7. [Languages](#7-languages)
8. [Data model](#8-data-model)
9. [Project structure](#9-project-structure)
10. [Running it locally](#10-running-it-locally)
11. [Testing](#11-testing)
12. [Deploying to GoDaddy](#12-deploying-to-godaddy)
13. [Status and limitations](#13-status-and-limitations)
14. [What comes next](#14-what-comes-next)

---

## 1. The problem

Across Indian cities, thousands of women run, or want to run, tiffin services from their kitchens. The business is simple: cook one menu a day, take orders before a cut-off, deliver nearby. Running it online is not.

- **Website builders assume literacy in English.** They ask for typed descriptions, forms and settings. Many home cooks are fluent speakers but not confident readers or typists, especially in English.
- **The daily work is repetitive and happens on WhatsApp.** The menu changes every morning and is posted as a status half the customers miss. Orders arrive as scattered messages, and someone has to count them by hand before cooking.
- **Cities mix languages.** In Bangalore, the cook may speak Kannada while her customers come from every state and read Hindi, Tamil or English.

Existing tools help someone who already has a website. Nothing helps her go from "I cook well" to "I have a business people can order from" without first learning the tools.

## 2. Who it is for

| | The owner | The customer |
| --- | --- | --- |
| Who | A home cook starting or running a tiffin service | Office workers, students and families nearby |
| Language | Speaks Kannada, Hindi or English, often mixed | Reads any of the three |
| Device | An Android phone with Chrome | Any phone with a browser |
| What they need | Set up once, then update by voice in seconds | See today's menu, order quickly, pay on delivery |

## 3. What it does

**For the owner (`/owner`)**

- **Launch in one conversation.** The assistant asks what she cooks, where she delivers, how many people she can feed and what a plate costs her. It suggests prices that cover her costs with a fair margin, saves the kitchen, finds a free web address, and publishes her page.
- **Run it by voice.** "Only chapati and bisi bele bath today, orders until eleven." "Paneer is finished." "Cancel Ravi's order." "How many orders so far?"
- **Get a cooking list at cut-off.** Exact totals per dish, special requests translated into her language, and deliveries grouped by area.
- **Stay in control.** Anything that changes her business waits for her to tap **Yes**.
- **Write her announcements.** A ready WhatsApp message in her language announces the launch.

**For the customer (`/k` lists kitchens, `/k/<kitchen>` shows one)**

- Browse the home kitchens taking orders today, with their areas, dishes, lowest price and cut-off time.
- Today's menu in Kannada, Hindi or English, picked from the phone's language or a switch.
- Order with name, phone, area and an optional note in any language. No account, no app.
- Clear messages when orders are closed, a dish is sold out or the kitchen is full for the day.
- Pay by cash or UPI on delivery.

## 4. A walkthrough: Lakshmi's first day

This is a real conversation with the assistant, condensed and translated from Kannada.

> **Lakshmi:** Hello, I'm Lakshmi. I want to start a tiffin service from home. I make chapati palya, anna sambar and bisi bele bath. I deliver to Indiranagar and Domlur, I can feed thirty people a day, and a meal costs me about forty rupees.
>
> **Assistant:** At a forty-rupee cost, I suggest chapati palya at seventy, anna sambar at seventy and bisi bele bath at eighty. That gives you a good margin. Do these prices suit you?
>
> **Lakshmi:** Yes. Call it Lakshmi Tiffins.
>
> **Assistant:** I'll save Lakshmi Tiffins, delivering to Indiranagar and Domlur, thirty meals a day, with those prices. Shall I save it? **[Yes] [No]**

She taps Yes. The kitchen is saved, and each dish is translated into Hindi and English.

> **Assistant:** Saved. Three web addresses are free: lakshmitiffins.com, lakshmitiffins.in and lakshmitiffinsblr.com. Which do you like?
>
> **Lakshmi:** lakshmitiffins.in.

After two more Yes taps, the address is reserved and her page is public. The assistant writes her launch message for WhatsApp.

> **Lakshmi:** Today only chapati palya and bisi bele bath, orders until eleven at night.

She confirms, and the menu is live. Three customers order: Ravi in English with a note in Tamil asking for less spice, Priya in Hindi asking for no onion, and Arun in Kannada.

> **Lakshmi:** How many orders? Tell me the cooking list.
>
> **Assistant:** Three orders so far, seven meals: three chapati palya and four bisi bele bath. Special requests: Ravi wants it less spicy; Priya wants no onion. Indiranagar: Ravi, two chapati palya; Arun, one bisi bele bath. Domlur: Priya, one chapati palya and three bisi bele bath.

The totals come from the database, and the notes were translated from Tamil and Hindi into Kannada.

![User flow](docs/0-user-flow.png)

## 5. How it works

### Architecture

![Architecture](docs/0-architecture.png)

Everything runs as one Next.js app, so there is one thing to deploy.

| Part | What it does |
| --- | --- |
| Owner page `/owner` | Records speech, shows and speaks replies, shows Yes and No buttons |
| Agent route `/api/agent` | Runs the Claude loop and enforces the confirmation gate |
| Tools | The only code that can change data or call GoDaddy |
| Menu page `/k/[slug]` | Server-rendered menu in the customer's language, with the order form |
| Order route `/api/orders` | Validates and saves orders in a locked transaction, with no AI involved |
| MySQL | Seven tables hold all state |
| Claude API | Understands the owner, chooses tools, writes replies, translates dishes |
| GoDaddy Domains API | Checks whether web addresses are free |

### The agent loop

Claude never runs code. The app sends Claude the conversation plus descriptions of eight tools. Claude replies either with text for the owner, or with a request to run a tool. The app runs the tool, sends back the result, and asks again. This repeats until Claude answers in text, up to eight rounds per turn.

![Agent loop](docs/1-agent-loop.png)

On every round, the app also gives Claude the current state from the database: today's date and time in the kitchen's time zone, the saved dishes with their ids, and today's menu. Claude has no clock and no memory of the database, so without this it would guess.

### The eight tools

| Tool | What it does | Waits for Yes |
| --- | --- | --- |
| `create_kitchen` | Saves the kitchen, its dishes and usual prices, and translates the dishes | Yes |
| `check_domain` | Checks whether a web address is free | No |
| `register_domain` | Reserves the chosen address for the kitchen | Yes |
| `publish_site` | Makes the ordering page public | Yes |
| `update_menu` | Sets a day's dishes, prices and cut-off, or marks a holiday | Yes |
| `mark_sold_out` | Marks a dish sold out, or back on sale | No |
| `get_orders` | Reads a day's orders, with totals worked out in SQL | No |
| `cancel_order` | Cancels one order | Yes |

Each tool has three parts: a description Claude reads to decide when to use it, a flag saying whether it needs the owner's Yes, and a plain TypeScript function. The function checks every input again, because model output is never trusted. If an input is wrong, the error goes back to Claude in plain words, and Claude corrects itself or asks her.

### The confirmation gate

![Confirmation gate](docs/2-confirmation-gate.png)

When Claude asks for a tool that needs a Yes, the app does not run it. It checks the input without changing anything, saves the request with the conversation, and tells Claude the action is waiting. Claude reads it back to her and the page shows Yes and No buttons. The tool runs only when a separate Yes tap arrives. If she taps No, or says something else instead, nothing changes.

### The customer side has no AI

Placing an order is ordinary code. The order route locks the day's menu row, then checks in one transaction that the kitchen is live, the cut-off hasn't passed, no dish is sold out and the day's capacity isn't exceeded. A double tap sends the same idempotency key, so it creates one order.

## 6. Design decisions

- **Voice in both directions.** She may not read comfortably, so she speaks and hears replies. Typing still works, and every reply also appears as text.
- **Yes is a button, not a word.** A misheard "yes" should never publish a page or cancel a customer's order. The gate is enforced in code, not left to the prompt.
- **Claude never touches the database.** It can only call eight functions, each of which validates its input. This keeps the agent's behaviour bounded and testable.
- **Numbers come from SQL.** Order counts and totals are computed by the database. Claude only phrases them, because language models are unreliable at arithmetic.
- **Ordering doesn't depend on AI.** If Claude or GoDaddy is unreachable, customers can still order.
- **Translate once, at save time.** Dishes are translated when saved, not on every page view, so the menu page is fast and costs nothing to serve.
- **Transliterate dish names.** "ಬಿಸಿ ಬೇಳೆ ಬಾತ್" becomes "बिसि बेले बाथ" and "Bisi Bele Bath", never a literal translation. A one-line description explains the dish to people who don't know it.
- **No WhatsApp integration.** The owner shares a link with a ready message. This avoids the WhatsApp Business API and its approval process.
- **No online payment.** Cash or UPI on delivery is how tiffin services already work.

## 7. Languages

The owner and each customer use their own language, and neither needs to know the other's. The launch set is Kannada, Hindi and English.

| Where | How |
| --- | --- |
| Owner speech to text | The browser's speech recognition, set to `kn-IN`, `hi-IN` or `en-IN` |
| Understanding her | Claude, including mixed-language speech |
| Replies | Claude replies in her language; the browser reads it aloud with a voice installed on her phone |
| Dishes, kitchen name, delivery area | Translated by Claude when saved, stored per language; names and places are transliterated |
| Menu page labels | A small dictionary per language in `src/lib/i18n.ts` |
| Customer notes | Stored as written, translated into her language in the cooking list |

Adding a language means one entry in the language list and one dictionary of labels.

## 8. Data model

| Table | Holds |
| --- | --- |
| `kitchens` | Name, web address slug, owner's language, delivery area, their translations, daily capacity, time zone, domain, `draft` or `live` |
| `menu_items` | Each dish as the owner said it, its usual price, and translations as JSON |
| `daily_menus` | One row per kitchen per day: cut-off time and `open`, `closed` or `holiday` |
| `daily_menu_items` | Which dishes are on a day's menu, that day's price, and whether sold out |
| `orders` | Customer name, phone, area, note, language, `placed` or `cancelled`, idempotency key |
| `order_items` | Dishes and quantities in each order, with the price paid |
| `conversations` | The agent's message history and any action waiting for a Yes |

The full schema is in [`schema.sql`](schema.sql). Prices are whole rupees.

## 9. Project structure

![Code map](docs/3-code-map.png)

| Path | What it does |
| --- | --- |
| `src/app/owner/` | Owner page: chat, microphone, spoken replies, language picker (`voice.ts` holds the speech code) |
| `src/app/k/[slug]/` | Customer menu page, language switch and order form |
| `src/app/api/agent/route.ts` | `POST /api/agent` |
| `src/app/api/orders/route.ts` | `POST /api/orders` |
| `src/lib/agent.ts` | The loop, system prompt, confirmation gate and conversation storage |
| `src/lib/tools.ts` | The eight tools |
| `src/lib/model.ts` | The one place that calls Claude |
| `src/lib/translate.ts` | Dish translation |
| `src/lib/godaddy.ts` | Domain checks |
| `src/lib/orders.ts` | Order validation and the locked transaction |
| `src/lib/menu.ts` | Reads today's menu for the page |
| `src/lib/i18n.ts` | Languages and page labels |
| `src/lib/time.ts` | Today and now in the kitchen's time zone |
| `schema.sql`, `scripts/` | Tables, migration and a demo kitchen |
| `tests/agent.test.ts` | End-to-end test of the agent |
| `docs/` | Diagrams and the [agent guide](docs/stage-2-agent-guide.md) |

Built with Next.js 16, React 19, TypeScript, MySQL via `mysql2`, and the Anthropic SDK.

## 10. Running it locally

You need Node.js 22 or later, a MySQL or MariaDB database, and a Claude API key from the [Claude Console](https://platform.claude.com).

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run db:migrate        # creates the tables
npm run db:seed           # optional: a simple demo kitchen with today's menu
npm run db:seed-demo      # optional: Lakshmi Tiffins, live, with orders in three languages
npm run dev
```

| Variable | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `mysql://user:password@host:3306/dbname` (or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) |
| `ANTHROPIC_API_KEY` | For `/owner` | Your Claude API key, starting `sk-ant-` |
| `CLAUDE_MODEL` | No | Defaults to `claude-sonnet-5-5` |
| `GODADDY_API_KEY`, `GODADDY_API_SECRET` | No | GoDaddy test environment keys. Without them, domain checks are simulated |

Then open:

- http://localhost:3000/owner to launch a kitchen by talking to the assistant
- http://localhost:3000/k/ammas-kitchen for the simple demo kitchen's menu
- After `db:seed-demo`: http://localhost:3000/k for the list of four demo kitchens (one is closed today), http://localhost:3000/k/lakshmi-tiffins for Lakshmi's menu, and http://localhost:3000/owner?t=11a6b5e1-d4e1-4000-8000-000000000001 to talk to the assistant as Lakshmi. It already has six orders (one more cancelled), so you can ask straight away for the cooking list. Re-run the seed to reset.

Voice input needs Chrome, and the microphone only works on `localhost` or an HTTPS address. Never commit `.env`; it is already in `.gitignore`.

## 11. Testing

```bash
npm run test:agent
```

This runs the whole launch flow against the database with a scripted stand-in for Claude, so it needs no API key and costs nothing. It checks 11 behaviours: the interview, bad tool input being corrected, the confirmation gate holding writes, Yes and No, speaking instead of answering, publishing, the daily menu, a real customer order, exact totals, cancelling, sold out, and the eight-round limit. On every request it also checks the two rules Claude's API enforces: roles alternate, and every tool result answers the request right before it.

The full flow has also been run with the real Claude in Kannada and English, which is how two bugs in the confirmation step and translations were found and fixed.

## 12. Deploying to GoDaddy

The app is built for GoDaddy Node.js Hosting, which runs Next.js as a persistent Node.js 22 process and includes a managed MySQL database. It passes GoDaddy's deploy validator, and it creates its own tables when the server starts, so no shell access is needed.

1. Create a Node.js Hosting app by uploading a zip of this repository (made with `git archive --format=zip -o tiffin.zip HEAD`) or by syncing the GitHub repository.
2. In the app's **Settings**, add `ANTHROPIC_API_KEY`. GoDaddy supplies the database settings (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) itself.
3. Optionally add `SEED_DEMO_ON_START=1`, restart once to load the Lakshmi Tiffins demo, then remove it so later restarts don't reset the demo.
4. Publish, and connect a domain in **Settings**. HTTPS comes with the hosting, which the microphone needs.

The tables are created automatically on every start, and doing so again is harmless.

## 13. Status and limitations

**Working:** launch by conversation, menu and prices, kitchen save with translations of dishes, name and area, domain checks, publishing, daily menu, sold out, cancelling, orders, the cooking list, three languages, and voice in and out.

**Known limitations:**

- **Domains:** availability is simulated until GoDaddy test keys are added. Registration reserves the name in the app but does not buy it, and the assistant says "reserved", not "bought".
- **No owner login yet.** Whoever holds a conversation's token can act for that kitchen. This is fine for a demo, not for real use.
- **Voice quality depends on the phone.** Speech recognition accuracy and the availability of Kannada and Hindi voices vary by device.
- **Replies take 1 to 8 seconds,** because each turn may run several tool rounds. Streaming would make it feel faster.

## 14. What comes next

- Owner sign-in by phone number and one-time code
- Real domain purchase through GoDaddy, and the domain pointing straight at her page
- Streaming replies so she hears the first words sooner
- More languages: Tamil, Telugu, Marathi
- Weekly summaries: what sold, what ran out, which areas order most
- Other home businesses with the same shape: bakers, tailors, tutors

---

The [agent guide](docs/stage-2-agent-guide.md) explains the agent, tools, confirmation gate and voice step by step, for readers new to building with AI.
