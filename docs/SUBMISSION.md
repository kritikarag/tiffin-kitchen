## Inspiration

Students, office workers and daily-wage workers far from home need a home-cooked meal every day, and often a woman nearby cooks well enough to feed them. But food apps assume English, typing and comfort with technology. Tiffin lets the cook run her kitchen by speaking her own language, and each customer order in theirs. Nothing to install, no account, nine Indian languages.

## Try it yourself

Use Chrome and allow the microphone. Every page has a language dropdown.

**As a customer:** Open tiffin.kitchen → Browse kitchens → Lakshmi Tiffins. Read the menu in your language (the cook wrote it in Kannada). Order with your name, your own mobile number and full address; tap the mic to speak an allergy note like "मूंगफली से एलर्जी है". Tap Track my order to follow it (received → preparing → on the way), then tap "I've received my tiffin". Ordering again asks "Did your last tiffin arrive?" first, then offers "Same as last time". My orders lists current and past orders. You pay the cook at the door.

**As a cook:** Open the demo kitchen at tiffin.kitchen/owner?t=11a6b5e1-d4e1-4000-8000-000000000001. Tap the mic or type: "How many orders today?", "The chapati is finished", "Tomorrow chapati palya and bisi bele bath, orders until eleven", "Sunday is a holiday", "Tell me the cooking list", "I've started cooking", "Cancel Meera's order", "Ravi brought back two dabbas". Each reply shows What I did; changes wait for your Yes. Tap Today's orders for totals, red allergy notes in your language, addresses with Map, dabbas, Preparing / On the way, and Tell on WhatsApp (a message in the customer's language with their tracking link). Your screen chimes for new orders and when a customer confirms delivery.

**Start your own kitchen:** In a private window, tap Start my kitchen, then Camera or Upload a photo of a handwritten menu (Hindi, Kannada or English). Claude reads every dish and price, checks a web address with GoDaddy, and your private kitchen link opens when you tap Yes.

## What it does

- Launch from one photo of a handwritten menu, or one conversation.
- Run the kitchen by voice: a Claude agent with 11 checked tools; every step shown; every change waits for a Yes button.
- Exact totals from the database; allergy notes in red, translated.
- Preparing → On the way, with WhatsApp updates in the customer's language. Only the customer marks it delivered.
- Customers order by voice in their language, track, reorder in two taps, and pay at the door.

## Built with Claude and GoDaddy

GoDaddy Node.js Hosting and hosted MySQL run the app at tiffin.kitchen (GoDaddy domain and Professional Email); the GoDaddy Domains API checks cooks' web addresses. Claude Sonnet runs the cook's agent and reads menu photos; Claude Haiku translates, fixes misheard dish names and flags allergies.

## Future scope

Phone-number sign-in for cooks and customers, live map tracking, online payment, and other home businesses like bakers and tailors.
