# Tiffin: a voice-first assistant for home kitchens

**Built for the GoDaddy Inclusive Innovation Hackathon 2026 with Claude and GoDaddy.** Live at [tiffin.kitchen](https://tiffin.kitchen) · Contact: [hello@tiffin.kitchen](mailto:hello@tiffin.kitchen)

Home-cooked food without platform fees, and a food business without the English. Tiffin connects home cooks with the people nearby who want their food: the cook launches and runs her kitchen by speaking her own language, and each customer orders in theirs.

Most tools that help a small business get online stop once the website is live. A home tiffin kitchen's real work starts after that, and it repeats every day: a new menu each day, orders that close at a cut-off, dishes that run out, and before cooking, an exact count of what to make and where it goes.

Tiffin is an assistant for that daily loop, in the cook's own language. She speaks tomorrow's menu and taps Yes. She says "the payasa is finished" and the page shows it sold out. New orders ring on her screen. At cut-off she hears the cooking list: allergy notes first, then exact totals, customer notes translated into her language, deliveries grouped by area. Getting started takes one conversation, or one photo of her handwritten menu, and ends with a web address and a live ordering page. Every step the assistant takes is shown on screen, and nothing changes her business until she taps Yes.

Her customers browse the kitchens near them, read the menu in their own language and order in a few taps, with no app and no account.

![Tiffin home page](docs/home-page-en.png)

![A tour of the app: the owner talks to the assistant, customers choose a kitchen, order in a few taps, and the owner sees her orders](docs/app-tour-en.png)

Every page works in nine languages: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali and Gujarati, picked from a dropdown. The same menu, as three customers would see it:

![The same menu in English, Hindi and Kannada](docs/same-menu-three-languages.png)

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

Two groups of people want the same thing and struggle to find each other.

**People who want home-cooked food.** Students, office workers, people living away from family and older people living alone want simple, home-style meals every day. Food delivery apps mostly sell restaurant food, and every order carries delivery fees, packaging and platform charges on top of the meal. A cook in the next street can make the same meal for less, but she is hard to find unless someone forwards her number.

**Workers who need a fair daily meal.** It is not only about missing home food. Construction workers, drivers, security guards, delivery riders and domestic workers, many of them far from home, need a filling meal at a fair price every single day. Delivery apps price them out, and most apps assume English, an account and a lot of reading and typing. A tiffin from a local cook is what many already rely on, arranged through phone calls and word of mouth.

**Home cooks who could feed them.** Many women cook well enough to run a tiffin service from home, and many already do, informally. What holds them back is not the cooking, it is everything around it:

- **Delivery platforms are built for restaurants.** Signing up as a partner, managing a menu and reading payouts happen in English, through forms and dashboards, and the commission eats into a meal that sells for a few dozen rupees.
- **Website builders, including the new AI ones, also assume English and typing,** and they stop once the page is live.
- **The daily work happens on WhatsApp.** The menu is posted as a status half the customers miss. Orders arrive as scattered messages and are counted by hand before cooking. Payments are hard to track, and the steel boxes the food goes out in don't always come back.

**Language cuts both ways.** Not everyone works in an office where English is the default. A cook in Bangalore may be comfortable only in Kannada, while her customers read Hindi, Tamil, Bengali or English. Today one side always has to work in the other's language, or in English that neither is comfortable with, and a note like "peanut allergy" can get lost in between.

**A tiffin kitchen is not a shop.** Its menu changes every day, orders close at a cut-off, dishes run out, boxes have to come back, and before every meal someone has to know exactly what to cook and where it goes. Store builders treat that as a product catalogue and an order inbox, which leaves her counting on paper again.

Tiffin works for both ends. The cook launches and runs her kitchen by speaking her own language, and each customer orders in theirs, with no app, no account and no English needed. Tiffin takes no commission and adds no platform fee: customers pay the cook directly, and her price is the price.

## 2. Who it is for

| | The owner | The customer |
| --- | --- | --- |
| Who | A home cook starting or running a tiffin service | Daily-wage and blue-collar workers, students, office workers, older people living alone, and families nearby |
| Language | Speaks any of nine Indian languages or English, often mixed | Reads any of the nine; ordering is a few taps, with no account, and "Same as last time" makes a daily order two taps |
| Device | An Android phone with Chrome | Any phone with a browser |
| What they need | Set up once, then update by voice in seconds, with no English and no forms | Find home food nearby, read the menu in their language, order quickly, pay her at the door, in cash or by UPI |

## 3. What it does

**For the owner (`/owner`)**

- **Launch in one conversation.** She tells the assistant her dishes and prices, and where she delivers. It saves exactly what she says, finds a free web address, and publishes her page. If she isn't sure what to cook or charge, she can ask, and it suggests prices from her costs.
- **Or photograph her menu.** She taps 📷 and a camera opens inside the page: she frames her handwritten menu, taps **Take photo**, then **Use photo** or **Retake**. Next to 📷 Camera, **🖼 Upload** picks a photo already on her phone or laptop, and on a laptop she can also drag the photo onto the page. Claude reads each dish and price exactly as written, reads them back, and asks about anything unclear instead of guessing. Nothing is saved until she taps Yes.
- **Speak at her own pace.** She taps the mic, talks with as many pauses as she needs, and taps ✓ when done. The words land in the message box so she can fix a misheard word before tapping Send. ✕ throws a recording away.
- **Run it by voice.** "Only chapati and bisi bele bath today, orders until eleven." "Paneer is finished." "Cancel Ravi's order." "How many orders so far?"
- **See today's orders at a glance.** A **Today's orders** button opens a screen with the number of orders, plates and money to collect, the totals to cook per dish, and every order grouped by delivery area: name, tap-to-call phone, dishes, amount and the customer's note translated into her language. It refreshes by itself every 30 seconds; cancelled orders are listed separately.
- **Get back to her kitchen from any phone.** The moment her kitchen is saved, her private link opens by itself at the top of the page ("Your kitchen is saved. Save this link now"), and the assistant tells her to save it. After that, **My kitchen link** shows it again, with buttons to copy it or send it to her own WhatsApp. Opening it on any phone or computer brings back her kitchen and her conversation. If she opens a fresh chat and asks to change her menu, the assistant tells her to open that link rather than starting a new kitchen.
- **Hear about each new order.** While her page is open, a banner and a short chime announce each new order with the name, dishes and amount, and **See orders** opens the orders screen. Customers can also tap **Also tell the cook on WhatsApp** after ordering to send her a copy written in her language. It is optional: the order is already placed and on her screen.
- **Ordering closes on its own.** Each day's menu has a cut-off time. At that moment the page shows the menu as closed and the server refuses late orders, so she never has to tell anyone "no more orders". She can set tomorrow's menu the evening before.
- **Get a cooking list at cut-off.** It starts with any allergy or health notes, then exact totals per dish, other requests translated into her language, and deliveries grouped by area.
- **See allergy notes in red.** A note like "मूंगफली से एलर्जी है" (peanut allergy, in Hindi) shows in red on her orders screen, translated into her language, with the original below it. Claude checks each note once, when she first reads her orders, never while the customer is ordering. It is an extra safeguard: every note is always shown in full, flagged or not.
- **Move each order along and tell the customer.** Every order goes **🍳 Preparing → 🛵 On the way**, with a button for each step. Only the customer can mark it **✓ Delivered** (below); the cook has no Delivered button, and the assistant refuses to mark it. She can say it too: "I've started cooking", "Ravi's tiffin has left", "all Domlur orders are delivered". **Tell Ravi on WhatsApp** opens WhatsApp to that customer with the message already written in the customer's own language, with their tracking link ("Hi Ravi, your tiffin from Lakshmi Tiffins is on the way. Track it here: …"). She taps Send. The orders screen counts how many are delivered so far.
- **Hear when food arrives, or doesn't.** When a customer taps **I've received my tiffin**, her screen chimes with "✅ Priya received their tiffin", and the order shows **Delivered · confirmed by customer**, at once if Today's orders is open. If they tap **It didn't arrive**, a red alert with their tap-to-call number appears, and the order is marked "Customer says it didn't arrive" so she can call them.
- **Keep track of dabbas.** One box goes out with each order. Her orders screen shows how many each customer still has, with a **Mark returned** button, and she can say "Ravi brought back two dabbas" or ask "who still has my boxes?".
- **Paid at the door, with no fees.** Customers pay her in cash or by UPI when the tiffin arrives, the way tiffin services already work. Nothing is paid through the app, so there is no gateway, no fee and no commission.

<img src="docs/allergy-and-dabbas.png" alt="An order card with a red peanut allergy note and the dabba count" width="300">
- **See what the assistant did.** Above each reply, a short list shows every action it took that turn: "✓ Read today's orders: 6 orders, 16 plates", "✓ Checked lakshmitiffins.in: available", "⏳ Marked Sunday as a holiday, not done yet, waiting for your Yes". Each line names the system that did the work (GoDaddy, Database, Hosting). The list is built from what the tools returned, not from Claude's wording, so it can't claim something that didn't happen.
- **Stay in control.** Anything that changes her business waits for her to tap **Yes**.
- **Write her announcements.** A ready WhatsApp message in her language announces the launch.

**For the customer (`/k` lists kitchens, `/k/<kitchen>` shows one)**

- Browse the home kitchens taking orders today, with their areas, dishes, lowest price and cut-off time. Open kitchens come first.
- Today's menu in English by default, switchable to Kannada or Hindi (the choice is remembered).
- Order with name, phone, area and an optional note in any language. No account, no app.
- Clear messages when orders are closed, a dish is sold out or the kitchen is full for the day.
- **Speak instead of typing.** The address and note boxes each have a 🎤 that listens in the language the customer picked, so someone who reads Hindi but can't type it can say "मूंगफली से एलर्जी है" (peanut allergy). The words land in the box to check before ordering.
- Give a full delivery address (house, street, landmark) as well as the area. The cook sees it on each order with a **Map** button that opens it in Google Maps, and it's in the WhatsApp message and the delivery list. The area groups deliveries into routes.
- Pay by cash or UPI on delivery.
- **Track the order.** After ordering, **Track my order** opens a page that shows where it is: order received, being prepared, on the way, delivered. It updates by itself, in the customer's language, and needs no account. When the food arrives the customer taps **✓ I've received my tiffin**, which marks the order delivered and tells the cook; **It didn't arrive** alerts her instead. Answering is required: before ordering again, the menu page asks "Did your last tiffin arrive?" with Yes and No, and Place order waits until they answer. The link holds a random code: the link holds a random code, so only someone who has the link can see it.
- **See current and past orders.** **🧾 My orders** (on the kitchen list and every menu page, once the phone has ordered) lists orders still on their way at the top, with their live stage, and earlier ones below, each with **Track** and **Place another order**. The list lives on the phone, like the saved details: no account, no sign-in, and "Not you?" clears it on a shared phone. Opening a tracking link from the cook's WhatsApp message adds that order to the list too.
- Get a WhatsApp message from the cook as the tiffin is prepared, sent out and delivered, in their own language. Sending her a copy of the order on WhatsApp is optional.
- Order again in two taps. The phone remembers the customer's details and last order (only in that browser, never in a link), so next time it says "Welcome back" and offers **Same as last time**. "Not you?" clears them on a shared phone. If the saved details have no address yet (saved before the address field existed), the page asks for it once, and the form always names the one field to fix rather than a general error.

<img src="docs/same-as-last-time.png" alt="A returning customer's Same as last time button" width="260">

<img src="docs/whatsapp-order.png" alt="Order confirmation with the Send my order on WhatsApp button" width="260"> <img src="docs/new-order-alert.png" alt="The owner's new-order banner" width="260">

## 4. A walkthrough: Lakshmi's first day

This walkthrough is put together from real conversations with the assistant, condensed and translated from Kannada.

> **Lakshmi:** Hello, I'm Lakshmi. I want to start a tiffin service from home. Chapati palya seventy rupees, anna sambar seventy, bisi bele bath eighty. I deliver to Indiranagar and Domlur.
>
> **Assistant:** I've noted chapati palya at seventy rupees, anna sambar at seventy and bisi bele bath at eighty. What should we call your kitchen?
>
> **Lakshmi:** Lakshmi Tiffins.
>
> **Assistant:** I'll save Lakshmi Tiffins, delivering to Indiranagar and Domlur, with those three dishes and prices. Shall I save it? **[Yes] [No]**

The prices are hers. The assistant only suggests prices if she asks, for example "I don't know what to charge", and then starts by asking what a plate costs her.

Instead of speaking the menu, she could photograph it. Given the sample below, which has a deliberately garbled line, the assistant replied: "I read five dishes. Poha for fifty rupees, Veg Thali for one hundred twenty, Rajma Chawal for one hundred, Aloo Paratha for seventy, and Gulab Jamun (two pieces) for forty. The note says Whitefield only, and orders by 11 am. Is all of this right?"

<img src="docs/sample-handwritten-menu.jpg" alt="Sample handwritten menu used in testing" width="300"> <img src="docs/in-page-camera.png" alt="The in-page camera framing the menu" width="220">

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
| Home page `/` | One line on what it is, then two days to tap through, each moment showing the real screen: the cook's day (Lakshmi, in Kannada) and her customer's (Priya, in Hindi: reading the menu, speaking a note, paying by UPI, tracking, confirming delivery, ordering again), how the agent and its eleven tools work, the guardrails, and a before and after. In any of the nine languages, with a button to the demo kitchen always in reach |
| Owner page `/owner` | Records speech into an editable box, sends menu photos, shows and speaks replies, shows Yes and No buttons, and lists today's orders |
| Agent route `/api/agent` | Runs the Claude loop and enforces the confirmation gate |
| Tools | The only code that can change data or call GoDaddy |
| Kitchen list `/k` | Every live kitchen with today's dishes, lowest price and whether it's open |
| Menu page `/k/[slug]` | Server-rendered menu in the customer's language, with the order form |
| Order route `/api/orders` | Validates and saves orders in a locked transaction, with no AI involved |
| MySQL | Eight tables hold all state, on GoDaddy's hosted MySQL |
| Claude API | Understands the owner, reads menu photos, chooses tools, writes replies, translates dishes |
| GoDaddy Domains API | Checks whether web addresses are free |
| GoDaddy Node.js Hosting | Runs the whole app (Node.js 22), deployed from this repository, on the project's own domain tiffin.kitchen |
| GoDaddy Professional Email | The project's contact address, hello@tiffin.kitchen |

### The agent loop

Claude never runs code. The app sends Claude the conversation plus descriptions of eleven tools. Claude replies either with text for the owner, or with a request to run a tool. The app runs the tool, sends back the result, and asks again. This repeats until Claude answers in text, up to eight rounds per turn.

![Agent loop](docs/1-agent-loop.png)

On every round, the app also gives Claude the current state from the database: today's date and time in the kitchen's time zone, the saved dishes with their ids, and today's menu. Claude has no clock and no memory of the database, so without this it would guess.

### The eleven tools

| Tool | What it does | Waits for Yes |
| --- | --- | --- |
| `create_kitchen` | Saves the kitchen, its dishes and usual prices, and translates the dishes | Yes |
| `check_domain` | Checks whether a web address is free | No |
| `register_domain` | Reserves the chosen address for the kitchen | Yes |
| `publish_site` | Makes the ordering page public | Yes |
| `update_menu` | Sets a day's dishes, prices and cut-off, or marks a holiday | Yes |
| `mark_sold_out` | Marks a dish sold out, or back on sale | No |
| `get_orders` | Reads a day's orders, with totals worked out in SQL, allergy flags and each customer's dabbas | No |
| `mark_delivery` | Marks orders preparing or on the way (delivered is the customer's to say), by order, by area or all at once | No |
| `cancel_order` | Cancels one order, and takes its dabba off the customer's count | Yes |
| `update_customer_boxes` | Checks or lists dabbas still with customers, or marks some returned | No |
| `update_kitchen_details` | Changes her WhatsApp number, or turns dabba counting on or off | Yes |

Each tool has three parts: a description Claude reads to decide when to use it, a flag saying whether it needs the owner's Yes, and a plain TypeScript function. The function checks every input again, because model output is never trusted. If an input is wrong, the error goes back to Claude in plain words, and Claude corrects itself or asks her.

### Showing the agent's work

Each reply from `/api/agent` carries a `steps` list next to the text: one entry per tool call, with its status (done, waiting for Yes, cancelled, failed) and the key facts from the tool's own result, such as the domain and whether it is free, or the order and plate counts. The owner page shows these above the reply in her language, with a tag for the system that did the work. A tool call that failed and that Claude then corrected is left out, so she sees only what actually happened.

<img src="docs/agent-steps-en.png" alt="Owner chat showing the assistant's steps above its reply" width="320">

### The confirmation gate

![Confirmation gate](docs/2-confirmation-gate.png)

When Claude asks for a tool that needs a Yes, the app does not run it. It checks the input without changing anything, saves the request with the conversation, and tells Claude the action is waiting. Claude reads it back to her and the page shows Yes and No buttons. The tool runs only when a separate Yes tap arrives. If she taps No, or says something else instead, nothing changes.

### Menu photos

The camera runs inside the page (the browser's camera API, back camera preferred), so every step stays on one screen. If camera access isn't allowed, the page says so and offers the gallery instead. The page shrinks the photo in the browser to at most 1,600 pixels on its longest side, as a JPEG of about 150 to 500 KB, so it uploads quickly on a mobile connection while handwriting stays readable. It goes to Claude as an image alongside her words, for that turn only. The stored conversation keeps a short note, "[A photo was shared here.]", rather than the image, so later turns stay small and cheap. Claude's reading of the menu stays in the history as text, and the save goes through `create_kitchen` or `update_menu` with the usual Yes.

### The customer side has no AI

Placing an order is ordinary code. The order route locks the day's menu row, then checks in one transaction that the kitchen is live, the cut-off hasn't passed, no dish is sold out and, if she set a daily plate limit, it isn't exceeded. A double tap sends the same idempotency key, so it creates one order.

## 6. Design decisions

- **Her menu, her prices.** The assistant writes down what she says or what her photo shows. It suggests dishes or prices only when she asks.
- **Voice in both directions.** She may not read comfortably, so she speaks and hears replies. Typing still works, and every reply also appears as text.
- **Misheard dish names are fixed before she sees them.** The browser's free speech recognition often turns Indian dish names into English words ("choleba today" for "chole bhature", "pavaji" for "pav bhaji"). A fast Claude model corrects these in about a second, using her saved dishes as hints. It never changes numbers, and she still checks the words before sending.
- **She decides when she's finished speaking.** Browsers stop listening after a short pause, which cut owners off mid-sentence. The app keeps listening through pauses until she taps ✓, then puts the words in an editable box rather than sending them straight away.
- **A photo is read, never guessed.** If a price in a photo is unclear, the assistant asks about that line.
- **Yes is a button, not a word.** A misheard "yes" should never publish a page or cancel a customer's order. The gate is enforced in code, not left to the prompt.
- **Claude never touches the database.** It can only call ten functions, each of which validates its input. This keeps the agent's behaviour bounded and testable.
- **Numbers come from SQL.** Order counts and totals are computed by the database. Claude only phrases them, because language models are unreliable at arithmetic.
- **Ordering doesn't depend on AI.** If Claude or GoDaddy is unreachable, customers can still order.
- **Translate once, at save time.** Dishes are translated when saved, not on every page view, so the menu page is fast and costs nothing to serve.
- **Transliterate dish names.** "ಬಿಸಿ ಬೇಳೆ ಬಾತ್" becomes "बिसि बेले बाथ" and "Bisi Bele Bath", never a literal translation. A one-line description explains the dish to people who don't know it.
- **WhatsApp through links, not the Business API.** Sending messages from a server needs Meta's approval. Instead the owner shares her page with a ready message, she tells each customer their tiffin is on the way or delivered with a prefilled wa.me message in the customer's language, which she sends with one tap. Her number is shown only to someone who has just ordered.
- **No online payment.** Cash or UPI on delivery is how tiffin services already work.

### Security and reliability

- **The confirmation gate is code, not a prompt.** Tools that save her kitchen, change a menu, publish, reserve a domain or cancel an order run as a dry run first and are stored as pending. They run for real only on a separate Yes request from the button, so neither a misheard word nor text inside a customer's note can trigger them.
- **Every tool input is checked again.** Claude's requests go through the same validation as any other untrusted input. Bad input goes back to Claude as a plain error, never into the database.
- **Allergy flags never touch ordering.** Notes are checked by Claude when the owner reads her orders, not when a customer orders, so the order path has no AI in it. A note that isn't flagged is still shown in full.
- **Prices and limits are enforced on the server.** An order's total is computed from the day's menu in the database, not from the browser. Cut-off, sold-out and a daily plate limit (only if she set one) are checked inside one database transaction, with the day's menu row locked so two orders at once can't both take the last plate.
- **The agent's report comes from the tools.** The steps list above each reply is built from what each tool returned, so it can't show an action that didn't happen.
- **Translation calls have no tools.** Customer notes are translated by a separate Claude call that can only return text, so a note can't make the agent act.
- **No secrets in the repository.** API keys live only in the hosting settings; `.env` is excluded from Git.
- **Ordering keeps working without AI.** The customer pages and the order endpoint are plain code with no calls to Claude.

## 7. Languages

The owner and each customer use their own language, and neither needs to know the other's. Nine are supported: English, Hindi, Kannada, Tamil, Telugu, Malayalam, Marathi, Bengali and Gujarati. Every page has a dropdown, and the choice is remembered.

Translation runs both ways. A Kannada-speaking cook writes her menu in Kannada; one customer reads it in Tamil and another in English; a note the Tamil customer writes reaches her in Kannada, in the orders screen, the cooking list and the WhatsApp message.

| Where | How |
| --- | --- |
| Owner speech to text | The browser's speech recognition, set to that language's Indian variant (`kn-IN`, `ta-IN`, ...) |
| Understanding her | Claude, including mixed-language speech |
| Replies | Claude replies in her language; the browser reads it aloud with a voice installed on her phone |
| Dishes, kitchen name, delivery area | Translated by Claude when saved, one small call per language in parallel on the fast model, so nine languages take about as long as one. Names and places are transliterated, never translated |
| Customer notes | Stored as written, translated into her language on the orders screen and in the cooking list |
| Screen labels | English, Hindi and Kannada are written by hand in the code. `npm run labels` translates every label set into the other languages with Claude, using Hindi and Kannada as examples of tone, checks that no key or `{placeholder}` was lost, and saves them to `src/lib/labels.generated.json` |
| Missing text | Falls back to English, then to what the owner said. Kitchens saved before a language was added still show in it, in English |

Adding a language means one line in `LANGUAGES` (`src/lib/i18n.ts`) and one run of `npm run labels`.

## 8. Data model

| Table | Holds |
| --- | --- |
| `kitchens` | Name, web address slug, owner's language, delivery area, their translations, an optional daily plate limit, time zone, domain, WhatsApp number, UPI ID (stored, not shown for now), whether dabbas are counted, `draft` or `live` |
| `menu_items` | Each dish as the owner said it, its usual price, and translations as JSON |
| `daily_menus` | One row per kitchen per day: cut-off time and `open`, `closed` or `holiday` |
| `daily_menu_items` | Which dishes are on a day's menu, that day's price, and whether sold out |
| `orders` | Customer name, phone, area, full delivery address, note, language, `placed` or `cancelled`, delivery status (`waiting`, `preparing`, `on_the_way`, `delivered`), the random code in its tracking link, who marked it delivered (the customer), whether the customer said it didn't arrive, the note's allergy flag (empty until checked), idempotency key |
| `customer_boxes` | Dabbas still with each customer, by kitchen and phone number |
| `order_items` | Dishes and quantities in each order, with the price paid |
| `conversations` | The agent's message history and any action waiting for a Yes |

The full schema is in [`schema.sql`](schema.sql). Prices are whole rupees.

## 9. Project structure

![Code map](docs/3-code-map.png)

| Path | What it does |
| --- | --- |
| `src/app/page.tsx`, `Home.tsx` | The home page |
| `src/components/Icon.tsx` | One set of line icons (from Lucide) for every button and status, drawn in the app's own colours, so they look the same on every phone; emoji appear only inside WhatsApp messages |
| `src/app/owner/` | Owner page: chat, microphone, spoken replies, language picker. `voice.ts` holds the speech code; `CameraSheet.tsx` is the in-page camera; `photo.ts` shrinks photos; `OrdersSheet.tsx` is the orders screen |
| `src/app/api/owner/orders/route.ts`, `src/lib/ownerOrders.ts` | Today's orders for the owner, with totals from SQL |
| `src/app/api/transcript/route.ts`, `src/lib/transcript.ts` | Fixing misheard dish names in dictation, and translating customer notes |
| `src/app/k/page.tsx` | Customer list of kitchens |
| `src/app/k/[slug]/` | Customer menu page, language switch and order form |
| `src/app/track/[code]/` | The customer's tracking page for one order |
| `src/app/orders/`, `src/lib/track.ts` | My orders: the orders placed on this phone, looked up by their tracking codes |
| `src/lib/delivery.ts` | Order stages and the WhatsApp messages that tell customers about them |
| `src/app/api/agent/route.ts` | `POST /api/agent` |
| `src/app/api/orders/route.ts` | `POST /api/orders` |
| `src/lib/agent.ts` | The loop, system prompt, confirmation gate and conversation storage |
| `src/lib/tools.ts` | The eleven tools |
| `src/lib/model.ts` | The one place that calls Claude |
| `src/lib/translate.ts` | Translation of dishes, kitchen names and delivery areas |
| `src/lib/godaddy.ts` | Domain checks |
| `src/lib/orders.ts` | Order validation and the locked transaction |
| `src/lib/menu.ts` | Reads today's menu for a kitchen, and the list of kitchens |
| `src/lib/startup.ts`, `src/instrumentation.ts` | Create the tables when the server starts, and optionally load the demo |
| `src/lib/i18n.ts` | Languages and page labels |
| `src/lib/time.ts` | Today and now in the kitchen's time zone |
| `schema.sql`, `scripts/` | Tables, migration and demo kitchens |
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
npm run db:seed-demo      # optional: four demo kitchens; Lakshmi Tiffins has orders and notes in several languages
npm run labels            # only after adding a language or a label: translates them with Claude
npm run dev
```

| Variable | Needed | What it is |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `mysql://user:password@host:3306/dbname` (or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) |
| `ANTHROPIC_API_KEY` | For `/owner` | Your Claude API key, starting `sk-ant-` |
| `CLAUDE_MODEL` | No | Defaults to `claude-sonnet-5-5` |
| `CLAUDE_FAST_MODEL` | No | Model that fixes misheard dish names in dictation. Defaults to `claude-haiku-5-5` |
| `GODADDY_API_KEY`, `GODADDY_API_SECRET` | No | GoDaddy test environment keys. Without them, or if GoDaddy can't be reached, domain checks are simulated and labelled as such |
| `DEMO_OWNER_WHATSAPP` | No | A 10-digit number given to the demo kitchen when it is seeded, so the "Send my order on WhatsApp" button appears. Use your own for a demo |
| `SITE_URL` | No | The site's address, used in tracking links sent on WhatsApp. Defaults to `https://tiffin.kitchen` |

Then open:

- http://localhost:3000/owner to launch a kitchen by talking to the assistant
- http://localhost:3000/k/ammas-kitchen for the simple demo kitchen's menu
- After `db:seed-demo`: http://localhost:3000/k for the list of four demo kitchens (one is closed today), http://localhost:3000/k/lakshmi-tiffins for Lakshmi's menu, and http://localhost:3000/owner?t=11a6b5e1-d4e1-4000-8000-000000000001 to talk to the assistant as Lakshmi. It already has six orders (one more cancelled), so you can ask straight away for the cooking list. Re-run the seed to reset.

Voice input works best in Chrome, and the microphone only works on `localhost` or an HTTPS address. Safari's speech support is weaker, especially for Kannada. Never commit `.env`; it is already in `.gitignore`.

## 11. Testing

```bash
npm run test:agent
```

This runs the whole launch flow against the database with a scripted stand-in for Claude, so it needs no API key and costs nothing. It checks 14 behaviours: the interview, bad tool input being corrected, the confirmation gate holding writes, Yes and No, speaking instead of answering, publishing, the daily menu, a real customer order counting one dabba, exact totals, cancelling (which returns the dabba), changing kitchen details only after Yes, allergy notes being flagged and plain ones not, marking dabbas returned, delivery stages and what the customer sees in My orders and on WhatsApp, sold out, and the eight-round limit. On every request it also checks the two rules Claude's API enforces: roles alternate, and every tool result answers the request right before it.

The full flow has also been run with the real Claude in Kannada and English, including a photographed menu, which found and fixed real bugs: the confirmation step, translations, and empty replies when Claude's thinking used up its reply budget. Voice behaviour (pauses, editing, discard, and phones whose voice list loads late) is checked in a browser with a simulated microphone.

## 12. Deploying to GoDaddy

**Checking which build is live:** the home page footer shows a version line, and `/api/version` returns it. After **Update preview**, if the version hasn't changed, the new build did not go live: open the deployment log in GoDaddy and look for the first error.

The app is built for GoDaddy Node.js Hosting, which runs Next.js as a persistent Node.js 22 process and includes a managed MySQL database. It passes GoDaddy's deploy validator, and it creates its own tables when the server starts, so no shell access is needed.

1. In Node.js Hosting, choose **Connect GitHub**, pick this repository and the `main` branch, and select **Import & Deploy**. (Uploading a zip made with `git archive --format=zip -o tiffin.zip HEAD` also works.)
2. In the app's **Settings**, add `ANTHROPIC_API_KEY`. GoDaddy supplies the database settings (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) itself.
3. Optionally add `SEED_DEMO_ON_START=1`, restart once to load the Lakshmi Tiffins demo, then remove it so later restarts don't reset the demo.
4. Publish, and connect a domain in **Settings**. HTTPS comes with the hosting, which the microphone needs.
5. After pushing changes to GitHub, select **Update preview** to rebuild.

The tables are created automatically on every start, and doing so again is harmless.

**Stale pages after a deploy.** GoDaddy's CDN caches script files for a year by their address, and the build can reuse a file name with new contents. Each build therefore gets its own `deploymentId` (in `next.config.ts`), which Next.js adds to every script and stylesheet address as `?dpl=...`, so browsers always load the files of the build that served the page. Before this, the live order form kept an old script and lost its address field.

## 13. Status and limitations

**Working:** launch by conversation or menu photo, a visible list of the agent's steps on each reply, the Today's orders screen, new-order alerts and WhatsApp order messages, kitchen save with translations of dishes, name and area, domain checks, publishing, daily menu, sold out, cancelling, the kitchen list, customer orders, the cooking list, nine languages, and voice in and out with editing before sending.

**Known limitations:**

- **No accounts yet, for owners or customers.** An owner reaches her kitchen through its private link, which works like a key: anyone with it can run that kitchen. The page remembers it in her browser and offers to send it to her WhatsApp. A customer's details and My orders live on the phone they ordered from, so a new phone starts empty. This is fine for a demo, not for real use; accounts are the first item in What comes next.

- **Domains:** with GoDaddy keys set, availability comes from GoDaddy's Domains API (test environment); without them it is simulated and labelled "GoDaddy · test". Registration reserves the name in the app but does not buy it, and the assistant says "reserved", not "bought".
- **Order alerts need her page open or the customer's tap.** The banner only appears while the owner page is open, and the WhatsApp message only arrives if the customer taps the button. Push notifications or the WhatsApp Business API would remove both conditions.
- **Her WhatsApp number is asked for at launch only.** There is no voice command to change it yet.
- **No rate limits yet** on the agent or order endpoints. Real use needs per-kitchen and per-address limits to cap Claude costs and spam.
- **Voice quality depends on the phone and browser.** Speech recognition accuracy and the availability of voices for each language vary by device; Chrome on Android works best. A phone without a voice for her language shows replies as text.
- **Labels in six languages are machine-translated.** English, Hindi and Kannada were written by hand; Tamil, Telugu, Malayalam, Marathi, Bengali and Gujarati were translated by Claude and checked by script for missing keys and placeholders, not yet by native speakers.
- **Customers can't order by voice yet.** Only the owner side has voice and photos.
- **Replies take 1 to 8 seconds,** because each turn may run several tool rounds. Streaming would make it feel faster.

## 14. What comes next

**First: personal accounts for owners and customers.** Sign-in with a phone number and a one-time code sent by SMS or WhatsApp, with no password and no email, so it works for people who don't read English.

- **Owners** sign in to their own kitchen instead of keeping a private link. One kitchen can have more than one person (a daughter who handles orders, someone who delivers), each with their own sign-in, and a lost phone no longer means a lost kitchen.
- **Customers** sign in once and see the same My orders, saved details and favourite dishes on any phone, and can save more than one address (home, work).
- Orders already store the customer's phone number, and kitchens the owner's WhatsApp number, so existing kitchens and order history can move into accounts without anyone starting again.

**For owners**

- **Status cards where people land.** A small card on the home page for a customer's order on its way, and for a cook's kitchen today. Built and taken out for now to keep the home page clean; today the order lives in My orders and the kitchen on her own page.
- **Live tracking on a map.** Today the tracking page shows the order's stage, set by the cook. Next, whoever delivers taps **Start delivery** on their phone and shares its location while the tiffin is on the way, so the customer sees it moving on a map with an arrival time, and the stage changes to Delivered on its own at their address.
- **A delivery charge per area, set by the cook.** Today she includes delivery in her dish prices.
- **Breakfast, lunch and dinner menus on the same day,** each with its own cut-off and cooking list, and customers ordering ahead for tomorrow. Today each kitchen has one menu a day, which closes automatically at its cut-off; she can already set tomorrow's menu in advance.
- **A speech model built for Indian languages,** such as Sarvam AI, instead of the browser's own recognition. It would hear mixed Hindi-English and dish names correctly the first time, rather than relying on Claude to fix them afterwards.
- **Order alerts without the page open,** through push notifications or the WhatsApp Business API, so she hears about every order even when the page is closed.
- **Real domain purchase** through GoDaddy, with the domain pointing straight at her page.
- **A shopping list from tomorrow's orders.** The cooking list already knows the portions; turning that into ingredients and quantities saves a morning trip.
- **Reminders to regulars.** A WhatsApp-ready message to customers who ordered last week, when today's menu has their favourite.
- **Weekly summaries by voice:** what sold, what ran out, which areas order most, what she earned.
- **Streaming replies,** so she hears the first words sooner.

**For customers**

- **Order by voice.** The customer speaks ("two chapati and one payasa, less spicy"); Claude fills in the form; the customer checks it and taps Place order, so ordering itself stays AI-free.
- **Paying ahead online.** A UPI QR code for the exact amount on the order screen, and payment confirmed automatically through a payment gateway, so the cook sees paid or unpaid on each order. Built once and taken out for now: without a gateway, the app could not confirm a payment, and a cook's UPI ID often shows her phone number.
- **Kitchens near me, by distance.** With the customer's permission, the kitchen list uses their current location to show each kitchen's distance ("1.2 km away"), sorts the nearest first, and hides kitchens that don't deliver to them. Kitchens would store a location and a delivery radius when the owner sets up, picked on a map or taken from her phone, and the order form would fill in the delivery area from the customer's location.
- **Ratings and repeat orders** in one tap.

**For the platform**

- **More languages:** Tamil, Telugu, Marathi. Each is one list entry and one label dictionary.
- **Other home businesses with the same shape:** bakers taking orders days ahead, tailors with measurements and delivery dates, home beauticians and tutors with time slots.
- **Practitioner services,** such as independent counsellors setting up a multilingual practice, with privacy and safety designed in from the start.

---

The [agent guide](docs/stage-2-agent-guide.md) explains the agent, tools, confirmation gate and voice step by step, for readers new to building with AI.
