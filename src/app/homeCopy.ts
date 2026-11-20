import { labelsFor, type Lang } from "@/lib/i18n";

// The home page's words. English, Hindi and Kannada are written here; other languages come from
// labels.generated.json (npm run labels). Lists keep their length in every language.

const en = {
  langLabel: "Language",
  title: "Your kitchen, in your language.",
  lead: "Say tomorrow's menu. Hear the cooking list at noon. Your customers order in their own language, and their notes reach you in yours.",
  start: "Start my kitchen",
  demo: "Browse kitchens",
  tiers: ["Dal tadka", "Paneer butter masala", "Jeera rice"],
  chatTitle: "Talk to it the way you'd talk to a helper",
  chatLead: "It does the work, shows you every step, and waits for your Yes before anything changes.",
  stepsHeading: "What I did",
  chatOwner1: "The paneer is finished.",
  chatStep1: "Marked a dish sold out",
  chatReply1: "Done. Customers now see paneer butter masala as sold out.",
  chatOwner2: "Tomorrow, rajma chawal and aloo paratha. Orders until eleven.",
  chatStep2: "Set tomorrow's menu: 2 dishes, orders until 11:00",
  chatWaiting: "waiting for your Yes",
  chatReply2: "Shall I put tomorrow's menu up?",
  yes: "Yes",
  no: "No",
  dayTitle: "How a day goes",
  day: [
    ["Morning", "Say today's menu, or send a photo of the one you wrote by hand. The page changes when you tap Yes."],
    ["Through the morning", "Customers order in their own language. Each new order rings on your screen, and can reach your WhatsApp too."],
    ["A dish runs out", "Just say so. Customers see it as sold out straight away."],
    ["Cut-off", "Hear the cooking list: how much of each dish, every note in your language, deliveries grouped by area."],
  ],
  langTitle: "Nine languages, both ways",
  langText: "She writes the menu in her language. Each customer reads it in theirs. What customers write comes back to her in hers.",
  trustTitle: "Built so she can trust it",
  trust: [
    ["Nothing changes without your Yes", "Menus, publishing and cancellations wait for a button tap, never a word that could be misheard."],
    ["Every step is shown", "Each reply lists what the assistant did, and which system did it."],
    ["Numbers come from the database", "Orders and totals are counted by the database, never guessed."],
    ["Ordering never depends on AI", "If the assistant is down, customers can still order."],
  ],
  footer: "Built with Claude and GoDaddy for the Inclusive Innovation Hackathon 2026.",
};

export type HomeCopy = typeof en;

export const HOME_COPY: { en: HomeCopy; hi: HomeCopy; kn: HomeCopy } = {
  en,
  hi: {
    langLabel: "भाषा",
    title: "आपकी रसोई, आपकी भाषा में।",
    lead: "कल का मेन्यू बोलिए। दोपहर को पकाने की सूची सुनिए। ग्राहक अपनी भाषा में ऑर्डर करते हैं, और उनके नोट आप तक आपकी भाषा में पहुँचते हैं।",
    start: "मेरी रसोई शुरू करें",
    demo: "रसोइयाँ देखें",
    tiers: ["दाल तड़का", "पनीर बटर मसाला", "जीरा राइस"],
    chatTitle: "जैसे किसी सहायक से बात करती हैं, वैसे ही बोलिए",
    chatLead: "यह काम करता है, हर कदम दिखाता है, और कुछ भी बदलने से पहले आपकी हाँ का इंतज़ार करता है।",
    stepsHeading: "मैंने क्या किया",
    chatOwner1: "पनीर खत्म हो गया।",
    chatStep1: "एक व्यंजन खत्म दिखाया",
    chatReply1: "हो गया। ग्राहकों को अब पनीर बटर मसाला खत्म दिख रहा है।",
    chatOwner2: "कल राजमा चावल और आलू पराठा। ऑर्डर ग्यारह बजे तक।",
    chatStep2: "कल का मेन्यू तय किया: 2 व्यंजन, ऑर्डर 11:00 तक",
    chatWaiting: "आपकी हाँ का इंतज़ार",
    chatReply2: "कल का मेन्यू लगा दूँ?",
    yes: "हाँ",
    no: "नहीं",
    dayTitle: "एक दिन ऐसे चलता है",
    day: [
      ["सुबह", "आज का मेन्यू बोलिए, या हाथ से लिखे मेन्यू की फ़ोटो भेजिए। हाँ दबाते ही पेज बदल जाता है।"],
      ["दिन चढ़ते", "ग्राहक अपनी भाषा में ऑर्डर करते हैं। हर नए ऑर्डर पर आपकी स्क्रीन पर घंटी बजती है, और वह WhatsApp पर भी आ सकता है।"],
      ["कुछ खत्म हो जाए", "बस बोल दीजिए। ग्राहकों को वह तुरंत खत्म दिखने लगता है।"],
      ["आख़िरी समय", "पकाने की सूची सुनिए: हर व्यंजन कितना, हर नोट आपकी भाषा में, डिलीवरी इलाके के हिसाब से।"],
    ],
    langTitle: "नौ भाषाएँ, दोनों तरफ़",
    langText: "वह मेन्यू अपनी भाषा में लिखती है। हर ग्राहक उसे अपनी भाषा में पढ़ता है। ग्राहक जो लिखते हैं, वह उस तक उसकी भाषा में पहुँचता है।",
    trustTitle: "भरोसे के लायक बनाया गया",
    trust: [
      ["आपकी हाँ के बिना कुछ नहीं बदलता", "मेन्यू, पेज प्रकाशित करना और ऑर्डर रद्द करना बटन दबाने पर ही होता है, गलत सुने गए शब्द से नहीं।"],
      ["हर कदम दिखता है", "हर जवाब के ऊपर लिखा होता है कि सहायक ने क्या किया और किस सिस्टम ने किया।"],
      ["गिनती डेटाबेस से", "ऑर्डर और कुल रकम डेटाबेस गिनता है, अंदाज़ा नहीं लगाया जाता।"],
      ["ऑर्डर AI पर निर्भर नहीं", "सहायक बंद हो, तब भी ग्राहक ऑर्डर कर सकते हैं।"],
    ],
    footer: "Claude और GoDaddy के साथ, Inclusive Innovation Hackathon 2026 के लिए बनाया गया।",
  },
  kn: {
    langLabel: "ಭಾಷೆ",
    title: "ನಿಮ್ಮ ಅಡುಗೆಮನೆ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ.",
    lead: "ನಾಳೆಯ ಮೆನು ಹೇಳಿ. ಮಧ್ಯಾಹ್ನ ಅಡುಗೆ ಪಟ್ಟಿ ಕೇಳಿ. ಗ್ರಾಹಕರು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡುತ್ತಾರೆ, ಅವರ ಸೂಚನೆಗಳು ನಿಮಗೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ತಲುಪುತ್ತವೆ.",
    start: "ನನ್ನ ಅಡುಗೆಮನೆ ಶುರು ಮಾಡಿ",
    demo: "ಅಡುಗೆಮನೆಗಳನ್ನು ನೋಡಿ",
    tiers: ["ದಾಲ್ ತಡ್ಕಾ", "ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ", "ಜೀರಾ ರೈಸ್"],
    chatTitle: "ಸಹಾಯಕರ ಜೊತೆ ಮಾತನಾಡುವಂತೆಯೇ ಮಾತನಾಡಿ",
    chatLead: "ಇದು ಕೆಲಸ ಮಾಡುತ್ತದೆ, ಪ್ರತಿ ಹೆಜ್ಜೆ ತೋರಿಸುತ್ತದೆ, ಏನನ್ನಾದರೂ ಬದಲಾಯಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಹೌದುಗಾಗಿ ಕಾಯುತ್ತದೆ.",
    stepsHeading: "ನಾನು ಮಾಡಿದ್ದು",
    chatOwner1: "ಪನೀರ್ ಮುಗಿದಿದೆ.",
    chatStep1: "ಒಂದು ತಿನಿಸು ಖಾಲಿ ಎಂದು ಗುರುತಿಸಿದೆ",
    chatReply1: "ಆಯಿತು. ಗ್ರಾಹಕರಿಗೆ ಈಗ ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ ಖಾಲಿ ಎಂದು ಕಾಣುತ್ತದೆ.",
    chatOwner2: "ನಾಳೆ ರಾಜ್ಮಾ ಚಾವಲ್ ಮತ್ತು ಆಲೂ ಪರಾಠಾ. ಹನ್ನೊಂದು ಗಂಟೆವರೆಗೆ ಆರ್ಡರ್.",
    chatStep2: "ನಾಳೆಯ ಮೆನು ಹಾಕಿದೆ: 2 ತಿನಿಸುಗಳು, 11:00 ವರೆಗೆ ಆರ್ಡರ್",
    chatWaiting: "ನಿಮ್ಮ ಹೌದುಗಾಗಿ ಕಾಯುತ್ತಿದೆ",
    chatReply2: "ನಾಳೆಯ ಮೆನು ಹಾಕಲೇ?",
    yes: "ಹೌದು",
    no: "ಬೇಡ",
    dayTitle: "ಒಂದು ದಿನ ಹೀಗೆ ನಡೆಯುತ್ತದೆ",
    day: [
      ["ಬೆಳಿಗ್ಗೆ", "ಇಂದಿನ ಮೆನು ಹೇಳಿ, ಅಥವಾ ನೀವೇ ಬರೆದ ಮೆನುವಿನ ಫೋಟೋ ಕಳುಹಿಸಿ. ಹೌದು ಒತ್ತಿದ ತಕ್ಷಣ ಪುಟ ಬದಲಾಗುತ್ತದೆ."],
      ["ಬೆಳಗಿನ ಹೊತ್ತು", "ಗ್ರಾಹಕರು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಆರ್ಡರ್ ಮಾಡುತ್ತಾರೆ. ಪ್ರತಿ ಹೊಸ ಆರ್ಡರ್‌ಗೆ ನಿಮ್ಮ ಪರದೆಯಲ್ಲಿ ಗಂಟೆ ಬಾರಿಸುತ್ತದೆ, WhatsApp ನಲ್ಲೂ ಬರಬಹುದು."],
      ["ಏನಾದರೂ ಮುಗಿದರೆ", "ಹೇಳಿದರೆ ಸಾಕು. ಗ್ರಾಹಕರಿಗೆ ತಕ್ಷಣ ಖಾಲಿ ಎಂದು ಕಾಣುತ್ತದೆ."],
      ["ಕೊನೆಯ ಸಮಯ", "ಅಡುಗೆ ಪಟ್ಟಿ ಕೇಳಿ: ಪ್ರತಿ ತಿನಿಸು ಎಷ್ಟು, ಪ್ರತಿ ಸೂಚನೆ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ, ಡೆಲಿವರಿ ಪ್ರದೇಶವಾರು."],
    ],
    langTitle: "ಒಂಬತ್ತು ಭಾಷೆಗಳು, ಎರಡೂ ಕಡೆ",
    langText: "ಅವರು ಮೆನುವನ್ನು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯುತ್ತಾರೆ. ಪ್ರತಿ ಗ್ರಾಹಕರು ತಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಓದುತ್ತಾರೆ. ಗ್ರಾಹಕರು ಬರೆದದ್ದು ಅವರಿಗೆ ಅವರ ಭಾಷೆಯಲ್ಲೇ ತಲುಪುತ್ತದೆ.",
    trustTitle: "ನಂಬಿಕೆಗೆ ತಕ್ಕಂತೆ ಮಾಡಲಾಗಿದೆ",
    trust: [
      ["ನಿಮ್ಮ ಹೌದು ಇಲ್ಲದೆ ಏನೂ ಬದಲಾಗುವುದಿಲ್ಲ", "ಮೆನು, ಪ್ರಕಟಣೆ, ಆರ್ಡರ್ ರದ್ದು ಎಲ್ಲವೂ ಬಟನ್ ಒತ್ತಿದಾಗ ಮಾತ್ರ, ತಪ್ಪಾಗಿ ಕೇಳಿದ ಪದದಿಂದ ಅಲ್ಲ."],
      ["ಪ್ರತಿ ಹೆಜ್ಜೆ ಕಾಣುತ್ತದೆ", "ಪ್ರತಿ ಉತ್ತರದ ಮೇಲೆ ಸಹಾಯಕ ಏನು ಮಾಡಿತು, ಯಾವ ವ್ಯವಸ್ಥೆ ಮಾಡಿತು ಎಂದು ಬರೆದಿರುತ್ತದೆ."],
      ["ಲೆಕ್ಕ ಡೇಟಾಬೇಸ್‌ನಿಂದ", "ಆರ್ಡರ್ ಮತ್ತು ಒಟ್ಟು ಮೊತ್ತವನ್ನು ಡೇಟಾಬೇಸ್ ಎಣಿಸುತ್ತದೆ, ಊಹಿಸುವುದಿಲ್ಲ."],
      ["ಆರ್ಡರ್ AI ಮೇಲೆ ಅವಲಂಬಿತವಲ್ಲ", "ಸಹಾಯಕ ಕೆಲಸ ಮಾಡದಿದ್ದರೂ ಗ್ರಾಹಕರು ಆರ್ಡರ್ ಮಾಡಬಹುದು."],
    ],
    footer: "Claude ಮತ್ತು GoDaddy ಜೊತೆ, Inclusive Innovation Hackathon 2026 ಗಾಗಿ ಮಾಡಲಾಗಿದೆ.",
  },
};

export function homeCopy(lang: Lang): HomeCopy {
  return labelsFor<HomeCopy>(HOME_COPY, "home", lang);
}

// One dish, written in each script: the clearest way to show that a name is transliterated, not translated.
export const ONE_DISH: Record<Lang, string> = {
  en: "Paneer Butter Masala",
  hi: "पनीर बटर मसाला",
  kn: "ಪನೀರ್ ಬಟರ್ ಮಸಾಲಾ",
  ta: "பனீர் பட்டர் மசாலா",
  te: "పనీర్ బటర్ మసాలా",
  ml: "പനീർ ബട്ടർ മസാല",
  mr: "पनीर बटर मसाला",
  bn: "পনির বাটার মসলা",
  gu: "પનીર બટર મસાલા",
};
