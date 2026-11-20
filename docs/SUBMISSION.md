## Inspiration

Students, office workers and daily-wage workers far from home need a filling, home-cooked meal every day. Most food apps assume English, typing and comfort with technology. Many women nearby already cook well enough to feed them, but every platform asks them to work in English, through forms and dashboards. So today it runs on WhatsApp messages and a notebook.

## Try it yourself

Works best in **Chrome**, on a laptop or a phone. Allow the microphone when asked. Every page has a language dropdown at the top: nine languages, including Hindi, Kannada and Tamil. Speak or type in any of them, or in English.

**See both sides at once:** open the cook's page in one window and [tiffin.kitchen](https://tiffin.kitchen) in a **private window** as the customer. Changes reach the other side within 20 seconds.

### As a customer

1. **Home page.** Open [tiffin.kitchen](https://tiffin.kitchen), pick your language, and tap through "One day in Lakshmi's kitchen" and "One day for Priya, her customer" to see each person's phone.
2. **Find a kitchen.** Tap **Browse kitchens**. Each kitchen shows its area, dishes, lowest price and order cut-off time; kitchens open today come first.
3. **Read the menu in your language.** Open **Lakshmi Tiffins**. The cook wrote it in Kannada; you read it in yours, with a short description of each dish. Sold-out dishes and the cut-off time are shown.
4. **Order.** Add dishes with + and −. Enter a name, **your own 10-digit mobile number**, your area and a full address (house, street, landmark). No account, no app.
5. **Speak instead of typing.** Tap the mic beside the address or the note and say it in your language, for example "मूंगफली से एलर्जी है" (peanut allergy). The words land in the box to check. If a field is missing, the form says exactly which one.
6. **Place the order.** You pay the cook by cash or UPI on delivery. Tap **Track my order**.
7. **Follow your tiffin.** The tracking page moves by itself: Order received → Being prepared → On the way.
8. **Confirm it arrived.** Tap **I've received my tiffin**, or **It didn't arrive**. Only the customer can mark an order delivered.
9. **Order again.** Reopen Lakshmi Tiffins. If your last order is on the way and unanswered, you're asked **"Did your last tiffin arrive?"** first. Then it says **Welcome back** and offers **Same as last time**: two taps. **Not you?** clears your details on a shared phone.
10. **My orders.** At the top of every page: current orders under **Now**, past ones under **Earlier**, each with **Track** and **Place another order**.

### As a cook

**Open the demo kitchen:** [Lakshmi Tiffins, cook's view](https://tiffin.kitchen/owner?t=11a6b5e1-d4e1-4000-8000-000000000001). It's a shared demo with a morning of orders, reset regularly. Tap the mic and speak (tap ✓ when done), or type. Every reply shows **What I did** with the system that did it (Database, GoDaddy, Claude), and can be read aloud with the speaker button. Anything that changes the kitchen waits for your **Yes**.

1. **Ask about orders:** "How many orders today?"
2. **Three requests in one sentence:** "How many orders today? The chapati is finished. Is lakshmikitchen.in free?" Watch the agent chain three tools.
3. **Sold out, and back on sale:** "The chapati is finished." Customers see it as sold out at once. Then: "Chapati is available again."
4. **Set tomorrow's menu:** "Tomorrow chapati palya and bisi bele bath, orders until eleven." It reads it back and waits for **Yes**.
5. **Take a day off:** "Sunday is a holiday." Also waits for Yes.
6. **The cooking list:** "Tell me the cooking list." Allergies first, then exact totals per dish, customer notes in your language, and deliveries grouped by area with addresses.
7. **Start cooking and send food out:** "I've started cooking" marks every order as being prepared. "All Domlur orders have gone out" marks them on the way.
8. **Cancel an order:** "Cancel Meera's order." It finds the order and waits for Yes.
9. **Dabbas (steel boxes):** "Ravi brought back two dabbas", or "Who still has my boxes?"
10. **Change your details:** "Change my WhatsApp number to 98XXXXXXXX." Waits for Yes.
11. **Today's orders screen.** Tap **Today's orders**:
    - Order count, plates, money to collect, and dabbas out.
    - Totals to cook per dish.
    - Every order grouped by area, with address, **Map** and tap-to-call.
    - Customer notes translated into your language with the original below; allergies in red.
    - Dabbas per customer, with **Mark returned**.
    - **Preparing** and **On the way** buttons, and **Tell on WhatsApp**, which opens a message to that customer already written in their language, with their tracking link.
    - When the customer confirms, the order shows **Delivered · confirmed by customer**; if they say it didn't arrive, a red alert with their number.
12. **Hear every order.** While the page is open, each new order rings with a banner, and so does each customer confirming delivery.
13. **Your kitchen link.** **My kitchen link** shows the private link that opens this kitchen on any phone, with **Send it to my WhatsApp** and **Copy link**.

### Start your own kitchen from a photo

1. Open [tiffin.kitchen](https://tiffin.kitchen) in a private window and tap **Start my kitchen** (or tap **Start over** on a cook's page).
2. Tap **Camera** to photograph a handwritten menu, or **Upload** to pick a menu photo from your phone or laptop (on a laptop you can drag it onto the page). Hindi, Kannada or English all work. You can also just say your dishes and prices.
3. Claude reads back every dish and price exactly as written and asks about anything unclear. Answer its questions (kitchen name, where you deliver, WhatsApp number) and tap **Yes** to save.
4. Your **private kitchen link** opens at the top: send it to your WhatsApp.
5. It checks web addresses with **GoDaddy**. Pick one, tap **Yes** to reserve it and **Yes** to publish. Your menu page is live, and it writes a WhatsApp message to announce your kitchen.

## What it does

- **Launch from one photo:** Claude reads a handwritten menu (Hindi, Kannada or English) exactly as written, asks about anything unclear, checks a web address with GoDaddy, and opens her private kitchen link.
- **Run the day by voice:** menus, sold out, holidays, cancellations, dabbas and order questions. One sentence can hold three requests: a Claude agent picks from 11 checked tools.
- **An agent she can trust:** every reply shows what it did and which system did it; anything that changes her business waits for a Yes button, enforced in code.
- **Exact numbers:** order totals come from the database, never from the AI; orders are saved in a locked transaction.
- **Allergies stand out:** a note like "मूंगफली से एलर्जी है" shows in red, in the cook's language, with the original below.
- **From kitchen to door:** Preparing → On the way, and one tap tells the customer on WhatsApp in their own language with a tracking link. Only the customer marks it delivered, and must answer before ordering again; the cook's screen chimes.
- **Order in your language, by voice:** no account; speak your address or allergy note; track, find past orders in My orders, reorder in two taps; pay at the door.
- **Nine languages, both ways:** dishes, notes and messages reach each side in their own language; dish names are transliterated, never translated.

## Built with Claude and GoDaddy

- **GoDaddy Node.js Hosting** runs the whole app with GoDaddy's hosted MySQL, deployed from GitHub, at **tiffin.kitchen** (GoDaddy domain, HTTPS), with **hello@tiffin.kitchen** on GoDaddy Professional Email.
- **GoDaddy Domains API** checks whether a cook's web address is free.
- **Claude Sonnet** runs the cook's agent and reads menu photos; **Claude Haiku** fixes misheard dish names, translates, and flags allergy notes. Claude was also the pair-programmer all week.

## Why it's different

- **Built for people new to technology.** Voice in and out, their own language on every screen, nothing to install and nothing to sign up for.
- **It runs the day after launch.** Most tools stop when the page is live. Tiffin handles the daily loop, from menu to doorstep, and the customer closes it.
- **No one has to switch language.** The cook and each customer use their own, with translation both ways.
- **An agent you can trust with a small business.** Every step is shown, every change waits for her Yes, numbers come from the database, and ordering keeps working if the AI is down.

**By the numbers:** 9 languages · 11 agent tools · 14 automated checks · 1 photo to start a kitchen · 0 apps to install

## Future scope

Phone-number sign-in for cooks and customers, live map tracking, paying ahead online through a gateway, order alerts when the page is closed, real domain purchase, and other daily home businesses like bakers and tailors.
