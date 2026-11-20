// The demo kitchens' text, kept apart from the seed so the label script can translate it into every language.
// English, Hindi and Kannada are written here; other languages come from demo-translations.json.

export const kitchen = {
  name: "ಲಕ್ಷ್ಮಿ ಟಿಫಿನ್ಸ್",
  area: "ಇಂದಿರಾನಗರ, ದೊಮ್ಮಲೂರು",
  translations: {
    kn: { name: "ಲಕ್ಷ್ಮಿ ಟಿಫಿನ್ಸ್", delivery_area: "ಇಂದಿರಾನಗರ, ದೊಮ್ಮಲೂರು" },
    hi: { name: "लक्ष्मी टिफ़िन्स", delivery_area: "इंदिरानगर, दोम्मलूरु" },
    en: { name: "Lakshmi Tiffins", delivery_area: "Indiranagar, Domlur" },
  },
};

// key is only used in the seed to refer to dishes.
export const dishes = [
  {
    key: "chapati",
    name: "ಚಪಾತಿ ಪಲ್ಯ",
    price: 70,
    today: true,
    translations: {
      kn: { name: "ಚಪಾತಿ ಪಲ್ಯ", description: "ಮೃದುವಾದ ಚಪಾತಿ ಮತ್ತು ತರಕಾರಿ ಪಲ್ಯ" },
      hi: { name: "चपाती पल्य", description: "नरम चपाती के साथ सूखी मसालेदार सब्ज़ी" },
      en: { name: "Chapati Palya", description: "Soft chapati with a dry spiced vegetable stir-fry" },
    },
  },
  {
    key: "sambar",
    name: "ಅನ್ನ ಸಾಂಬಾರ್",
    price: 70,
    today: false, // a saved dish that is not on today's menu
    translations: {
      kn: { name: "ಅನ್ನ ಸಾಂಬಾರ್", description: "ಅನ್ನ, ಸಾಂಬಾರ್ ಮತ್ತು ಮೊಸರು" },
      hi: { name: "अन्न सांबार", description: "चावल के साथ दाल और सब्ज़ियों का सांबर" },
      en: { name: "Anna Sambar", description: "Steamed rice with lentil and vegetable sambar" },
    },
  },
  {
    key: "bbb",
    name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್",
    price: 80,
    today: true,
    translations: {
      kn: { name: "ಬಿಸಿ ಬೇಳೆ ಬಾತ್", description: "ಬೂಂದಿ ಜೊತೆ ಬಿಸಿ ಬೇಳೆ ಬಾತ್" },
      hi: { name: "बिसि बेले बाथ", description: "दाल, चावल और सब्ज़ियों से बना कर्नाटक का व्यंजन" },
      en: { name: "Bisi Bele Bath", description: "Karnataka's spiced rice and lentils, with boondi" },
    },
  },
  {
    key: "payasa",
    name: "ಶಾವಿಗೆ ಪಾಯಸ",
    price: 40,
    today: true,
    translations: {
      kn: { name: "ಶಾವಿಗೆ ಪಾಯಸ", description: "ಹಾಲು ಮತ್ತು ಬೆಲ್ಲದ ಶಾವಿಗೆ ಪಾಯಸ" },
      hi: { name: "शाविगे पायसा", description: "दूध और गुड़ से बनी सेवइयों की खीर" },
      en: { name: "Shavige Payasa", description: "Vermicelli pudding with milk and jaggery" },
    },
  },
];

// ---- three more kitchens, for the customer list ----
const t = (kn, hi, en, knD, hiD, enD) => ({
  kn: { name: kn, description: knD },
  hi: { name: hi, description: hiD },
  en: { name: en, description: enD },
});
export const others = [
  {
    slug: "annapurna-rasoi",
    owner: "hi",
    capacity: 40,
    names: { kn: ["ಅನ್ನಪೂರ್ಣ ರಸೋಯಿ", "ಎಚ್‌ಎಸ್‌ಆರ್ ಲೇಔಟ್, ಕೋರಮಂಗಲ"], hi: ["अन्नपूर्णा रसोई", "एचएसआर लेआउट, कोरमंगला"], en: ["Annapurna Rasoi", "HSR Layout, Koramangala"] },
    status: "open",
    dishes: [
      [110, t("ರಾಜ್ಮಾ ಚಾವಲ್", "राजमा चावल", "Rajma Chawal", "ರಾಜ್ಮಾ ಕರಿ ಮತ್ತು ಅನ್ನ", "घर जैसा राजमा और चावल", "Kidney bean curry with steamed rice")],
      [90, t("ಆಲೂ ಪರಾಠ", "आलू पराठा", "Aloo Paratha", "ಮೊಸರು ಮತ್ತು ಉಪ್ಪಿನಕಾಯಿ ಜೊತೆ", "दही और अचार के साथ दो पराठे", "Two potato-stuffed flatbreads with curd and pickle")],
      [130, t("ದಾಲ್ ತಡ್ಕಾ ಥಾಲಿ", "दाल तड़का थाली", "Dal Tadka Thali", "ದಾಲ್, ಸಬ್ಜಿ, ರೊಟ್ಟಿ, ಅನ್ನ", "दाल, सब्ज़ी, रोटी और चावल", "Dal, a vegetable, rotis and rice")],
    ],
  },
  {
    slug: "fatimas-kitchen",
    owner: "en",
    capacity: 25,
    names: { kn: ["ಫಾತಿಮಾಸ್ ಕಿಚನ್", "ಫ್ರೇಜರ್ ಟೌನ್, ಕಾಕ್ಸ್ ಟೌನ್"], hi: ["फ़ातिमाज़ किचन", "फ़्रेज़र टाउन, कॉक्स टाउन"], en: ["Fatima's Kitchen", "Frazer Town, Cox Town"] },
    status: "open",
    dishes: [
      [180, t("ಚಿಕನ್ ಬಿರಿಯಾನಿ", "चिकन बिरयानी", "Chicken Biryani", "ದಮ್ ಬಿರಿಯಾನಿ, ರಾಯತ ಜೊತೆ", "दम बिरयानी, रायते के साथ", "Dum biryani with raita")],
      [140, t("ವೆಜ್ ಬಿರಿಯಾನಿ", "वेज बिरयानी", "Veg Biryani", "ತರಕಾರಿ ದಮ್ ಬಿರಿಯಾನಿ", "सब्ज़ियों की दम बिरयानी", "Vegetable dum biryani with raita")],
      [60, t("ಫಿರ್ನಿ", "फिरनी", "Phirni", "ಏಲಕ್ಕಿ ಅಕ್ಕಿ ಪಾಯಸ", "इलायची वाली चावल की खीर", "Cardamom rice pudding")],
    ],
  },
  {
    slug: "selvi-idli-mane",
    owner: "kn",
    capacity: 50,
    names: { kn: ["ಸೆಲ್ವಿ ಇಡ್ಲಿ ಮನೆ", "ಜಯನಗರ, ಬಿಟಿಎಂ ಲೇಔಟ್"], hi: ["सेल्वी इडली मने", "जयनगर, बीटीएम लेआउट"], en: ["Selvi Idli Mane", "Jayanagar, BTM Layout"] },
    status: "holiday", // closed today, so the list shows a realistic mix
    dishes: [
      [60, t("ಇಡ್ಲಿ ವಡೆ", "इडली वड़ा", "Idli Vada", "ಎರಡು ಇಡ್ಲಿ, ಒಂದು ವಡೆ, ಚಟ್ನಿ", "दो इडली, एक वड़ा, चटनी", "Two idlis, a vada and chutney")],
      [70, t("ಖಾರಾ ಪೊಂಗಲ್", "खारा पोंगल", "Khara Pongal", "ತುಪ್ಪದ ಅನ್ನ ಬೇಳೆ ಪೊಂಗಲ್", "घी वाला चावल-दाल पोंगल", "Rice and lentils with ghee and pepper")],
    ],
  },
];
