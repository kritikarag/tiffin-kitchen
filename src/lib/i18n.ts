// Fixed labels for the customer page. To add a language: add it to LANGUAGES and add one dictionary below.
// Dish names and descriptions are not here; they come from menu_items.translations.

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिन्दी" },
] as const;

export type Lang = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

// The customer's own choice (saved in a cookie) wins; otherwise English.
// To follow the phone's language again, set FOLLOW_BROWSER_LANGUAGE to true: then the browser's
// Accept-Language header is used before falling back to English.
const FOLLOW_BROWSER_LANGUAGE = false;

export function pickLanguage(cookieValue: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(cookieValue)) return cookieValue;
  if (FOLLOW_BROWSER_LANGUAGE) {
    for (const part of (acceptLanguage ?? "").split(",")) {
      const code = part.split(";")[0].trim().toLowerCase().split("-")[0];
      if (isLang(code)) return code;
    }
  }
  return DEFAULT_LANG;
}

const en = {
  kitchensTitle: "Home kitchens near you",
  kitchensLead: "Fresh home-cooked food, ordered before the cut-off and delivered the same day.",
  openUntil: "Open for orders until {time}",
  closedToday: "Orders closed for today",
  holidayToday: "Closed today",
  menuNotUp: "Today's menu is not up yet",
  from: "From ₹{price}",
  seeMenu: "See menu",
  noKitchens: "No kitchens are taking orders yet.",
  allKitchens: "All kitchens",
  todaysMenu: "Today's menu",
  deliversTo: "Delivers to {area}",
  orderBy: "Order by {time}",
  closed: "Orders are closed for today.",
  holiday: "The kitchen is closed today.",
  noMenu: "Today's menu is not up yet. Please check back later.",
  soldOut: "Sold out",
  yourName: "Your name",
  phone: "Phone number",
  area: "Delivery area",
  note: "Any request? (optional)",
  total: "Total",
  placeOrder: "Place order",
  placing: "Placing order…",
  payOnDelivery: "Pay by cash or UPI on delivery.",
  orderPlaced: "Order placed",
  thanks: "Thank you, {name}. Your order number is {id}.",
  orderAgain: "Place another order",
  notFound: "We could not find this kitchen.",
  err_empty: "Choose at least one dish.",
  err_invalid: "Please check your name, phone number and area.",
  err_closed: "Sorry, orders are closed for today.",
  err_sold_out: "Sorry, one of these dishes just sold out.",
  err_capacity: "Sorry, the kitchen is full for today.",
  err_generic: "Something went wrong. Please try again.",
};

export type Dictionary = typeof en;

const hi: Dictionary = {
  kitchensTitle: "आपके पास की घरेलू रसोइयाँ",
  kitchensLead: "घर का ताज़ा खाना, आख़िरी समय से पहले ऑर्डर करें, उसी दिन डिलीवरी।",
  openUntil: "{time} तक ऑर्डर लिए जा रहे हैं",
  closedToday: "आज के ऑर्डर बंद",
  holidayToday: "आज बंद है",
  menuNotUp: "आज का मेन्यू अभी नहीं आया",
  from: "₹{price} से",
  seeMenu: "मेन्यू देखें",
  noKitchens: "अभी कोई रसोई ऑर्डर नहीं ले रही है।",
  allKitchens: "सभी रसोइयाँ",
  todaysMenu: "आज का मेन्यू",
  deliversTo: "डिलीवरी: {area}",
  orderBy: "{time} तक ऑर्डर करें",
  closed: "आज के ऑर्डर बंद हो गए हैं।",
  holiday: "आज रसोई बंद है।",
  noMenu: "आज का मेन्यू अभी नहीं आया है। थोड़ी देर बाद देखें।",
  soldOut: "खत्म",
  yourName: "आपका नाम",
  phone: "फ़ोन नंबर",
  area: "डिलीवरी का इलाका",
  note: "कोई खास अनुरोध? (ज़रूरी नहीं)",
  total: "कुल",
  placeOrder: "ऑर्डर करें",
  placing: "ऑर्डर हो रहा है…",
  payOnDelivery: "डिलीवरी पर नकद या UPI से भुगतान करें।",
  orderPlaced: "ऑर्डर हो गया",
  thanks: "धन्यवाद, {name}। आपका ऑर्डर नंबर {id} है।",
  orderAgain: "एक और ऑर्डर करें",
  notFound: "यह रसोई नहीं मिली।",
  err_empty: "कम से कम एक व्यंजन चुनें।",
  err_invalid: "कृपया अपना नाम, फ़ोन नंबर और इलाका जाँचें।",
  err_closed: "माफ़ कीजिए, आज के ऑर्डर बंद हो गए हैं।",
  err_sold_out: "माफ़ कीजिए, इनमें से एक व्यंजन अभी खत्म हो गया।",
  err_capacity: "माफ़ कीजिए, आज के लिए रसोई भर चुकी है।",
  err_generic: "कुछ गड़बड़ हो गई। कृपया फिर से कोशिश करें।",
};

const kn: Dictionary = {
  kitchensTitle: "ನಿಮ್ಮ ಹತ್ತಿರದ ಮನೆ ಅಡುಗೆಮನೆಗಳು",
  kitchensLead: "ಮನೆಯ ತಾಜಾ ಊಟ, ಕೊನೆಯ ಸಮಯದೊಳಗೆ ಆರ್ಡರ್ ಮಾಡಿ, ಅದೇ ದಿನ ಡೆಲಿವರಿ.",
  openUntil: "{time} ವರೆಗೆ ಆರ್ಡರ್ ತೆಗೆದುಕೊಳ್ಳಲಾಗುತ್ತಿದೆ",
  closedToday: "ಇಂದಿನ ಆರ್ಡರ್‌ಗಳು ಮುಗಿದಿವೆ",
  holidayToday: "ಇಂದು ಮುಚ್ಚಿದೆ",
  menuNotUp: "ಇಂದಿನ ಮೆನು ಇನ್ನೂ ಬಂದಿಲ್ಲ",
  from: "₹{price} ರಿಂದ",
  seeMenu: "ಮೆನು ನೋಡಿ",
  noKitchens: "ಇನ್ನೂ ಯಾವ ಅಡುಗೆಮನೆಯೂ ಆರ್ಡರ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿಲ್ಲ.",
  allKitchens: "ಎಲ್ಲಾ ಅಡುಗೆಮನೆಗಳು",
  todaysMenu: "ಇಂದಿನ ಮೆನು",
  deliversTo: "ಡೆಲಿವರಿ: {area}",
  orderBy: "{time} ಒಳಗೆ ಆರ್ಡರ್ ಮಾಡಿ",
  closed: "ಇಂದಿನ ಆರ್ಡರ್‌ಗಳು ಮುಗಿದಿವೆ.",
  holiday: "ಇಂದು ಅಡುಗೆಮನೆ ಮುಚ್ಚಿದೆ.",
  noMenu: "ಇಂದಿನ ಮೆನು ಇನ್ನೂ ಬಂದಿಲ್ಲ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ನೋಡಿ.",
  soldOut: "ಖಾಲಿಯಾಗಿದೆ",
  yourName: "ನಿಮ್ಮ ಹೆಸರು",
  phone: "ಫೋನ್ ಸಂಖ್ಯೆ",
  area: "ಡೆಲಿವರಿ ಪ್ರದೇಶ",
  note: "ಏನಾದರೂ ವಿಶೇಷ ಸೂಚನೆ? (ಐಚ್ಛಿಕ)",
  total: "ಒಟ್ಟು",
  placeOrder: "ಆರ್ಡರ್ ಮಾಡಿ",
  placing: "ಆರ್ಡರ್ ಆಗುತ್ತಿದೆ…",
  payOnDelivery: "ಡೆಲಿವರಿ ಸಮಯದಲ್ಲಿ ನಗದು ಅಥವಾ UPI ಮೂಲಕ ಪಾವತಿಸಿ.",
  orderPlaced: "ಆರ್ಡರ್ ಆಗಿದೆ",
  thanks: "ಧನ್ಯವಾದಗಳು, {name}. ನಿಮ್ಮ ಆರ್ಡರ್ ಸಂಖ್ಯೆ {id}.",
  orderAgain: "ಇನ್ನೊಂದು ಆರ್ಡರ್ ಮಾಡಿ",
  notFound: "ಈ ಅಡುಗೆಮನೆ ಸಿಗಲಿಲ್ಲ.",
  err_empty: "ಕನಿಷ್ಠ ಒಂದು ತಿನಿಸನ್ನು ಆಯ್ಕೆ ಮಾಡಿ.",
  err_invalid: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಹೆಸರು, ಫೋನ್ ಸಂಖ್ಯೆ ಮತ್ತು ಪ್ರದೇಶವನ್ನು ಪರಿಶೀಲಿಸಿ.",
  err_closed: "ಕ್ಷಮಿಸಿ, ಇಂದಿನ ಆರ್ಡರ್‌ಗಳು ಮುಗಿದಿವೆ.",
  err_sold_out: "ಕ್ಷಮಿಸಿ, ಇವುಗಳಲ್ಲಿ ಒಂದು ತಿನಿಸು ಈಗಷ್ಟೇ ಖಾಲಿಯಾಗಿದೆ.",
  err_capacity: "ಕ್ಷಮಿಸಿ, ಇಂದಿಗೆ ಅಡುಗೆಮನೆ ಭರ್ತಿಯಾಗಿದೆ.",
  err_generic: "ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
};

const dictionaries: Record<Lang, Dictionary> = { en, hi, kn };

export function getDictionary(lang: Lang): Dictionary {
  return dictionaries[lang];
}

// fill("Order by {time}", { time: "11:00 AM" }) -> "Order by 11:00 AM"
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
