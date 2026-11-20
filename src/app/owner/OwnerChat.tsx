"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { canListen, canSpeak, listen, speak, stopSpeaking, type Listening, type OwnerLang } from "./voice";
import styles from "./owner.module.css";

type Line = { from: "owner" | "agent"; text: string };
type Pending = { name: string; summary: Record<string, unknown> } | null;

const TOKEN_KEY = "tiffin-owner-token";
const LANG_KEY = "tiffin-owner-lang";

// The owner's screen labels. Kept short and paired with icons, since she may not read comfortably.
const LABELS: Record<OwnerLang, Record<string, string>> = {
  en: {
    title: "Your kitchen assistant",
    startOver: "Start over",
    hint: "Tap the microphone and tell me about the tiffin service you want to start.",
    tapToSpeak: "Tap to speak",
    listening: "Listening… tap when you're done",
    discard: "Discard recording",
    yes: "Yes",
    no: "No",
    typeHere: "Or type here…",
    send: "Send",
    replay: "Play again",
    noMic: "Voice input does not work in this browser. Please type, or open this page in Chrome.",
    noPermission: "Please allow the microphone for this page, then tap again.",
    noSpeech: "I didn't hear anything. Tap and try again.",
    network: "Voice needs an internet connection. Please try again.",
    noVoice: "This phone has no voice for this language, so replies are shown as text.",
  },
  hi: {
    title: "आपकी रसोई सहायक",
    startOver: "फिर से शुरू करें",
    hint: "माइक दबाइए और बताइए आप कैसी टिफ़िन सेवा शुरू करना चाहती हैं।",
    tapToSpeak: "बोलने के लिए दबाएँ",
    listening: "सुन रही हूँ… बोल लें तो दबाएँ",
    discard: "रिकॉर्डिंग हटाएँ",
    yes: "हाँ",
    no: "नहीं",
    typeHere: "या यहाँ लिखें…",
    send: "भेजें",
    replay: "फिर से सुनें",
    noMic: "इस ब्राउज़र में आवाज़ से लिखना काम नहीं करता। कृपया लिखें, या यह पेज Chrome में खोलें।",
    noPermission: "कृपया इस पेज को माइक की अनुमति दें, फिर दोबारा दबाएँ।",
    noSpeech: "मुझे कुछ सुनाई नहीं दिया। दबाकर फिर से बोलें।",
    network: "आवाज़ के लिए इंटरनेट चाहिए। कृपया फिर से कोशिश करें।",
    noVoice: "इस फ़ोन में इस भाषा की आवाज़ नहीं है, इसलिए जवाब लिखकर दिखाए जाएँगे।",
  },
  kn: {
    title: "ನಿಮ್ಮ ಅಡುಗೆಮನೆ ಸಹಾಯಕ",
    startOver: "ಮತ್ತೆ ಶುರು ಮಾಡಿ",
    hint: "ಮೈಕ್ ಒತ್ತಿ, ನೀವು ಶುರು ಮಾಡಬೇಕಾದ ಟಿಫಿನ್ ಸೇವೆಯ ಬಗ್ಗೆ ಹೇಳಿ.",
    tapToSpeak: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ… ಮುಗಿದ ಮೇಲೆ ಒತ್ತಿ",
    discard: "ರೆಕಾರ್ಡಿಂಗ್ ಅಳಿಸಿ",
    yes: "ಹೌದು",
    no: "ಬೇಡ",
    typeHere: "ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ…",
    send: "ಕಳುಹಿಸಿ",
    replay: "ಮತ್ತೆ ಕೇಳಿ",
    noMic: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಬರೆಯಿರಿ ಅಥವಾ Chrome ನಲ್ಲಿ ತೆರೆಯಿರಿ.",
    noPermission: "ದಯವಿಟ್ಟು ಈ ಪುಟಕ್ಕೆ ಮೈಕ್ ಅನುಮತಿ ನೀಡಿ, ನಂತರ ಮತ್ತೆ ಒತ್ತಿ.",
    noSpeech: "ನನಗೆ ಏನೂ ಕೇಳಿಸಲಿಲ್ಲ. ಒತ್ತಿ ಮತ್ತೆ ಹೇಳಿ.",
    network: "ಧ್ವನಿಗೆ ಇಂಟರ್ನೆಟ್ ಬೇಕು. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    noVoice: "ಈ ಫೋನ್‌ನಲ್ಲಿ ಈ ಭಾಷೆಯ ಧ್ವನಿ ಇಲ್ಲ, ಆದ್ದರಿಂದ ಉತ್ತರಗಳನ್ನು ಬರಹದಲ್ಲಿ ತೋರಿಸಲಾಗುತ್ತದೆ.",
  },
};

const LANG_NAMES: { code: OwnerLang; label: string }[] = [
  { code: "kn", label: "ಕನ್ನಡ" },
  { code: "hi", label: "हिन्दी" },
  { code: "en", label: "English" },
];

// Browser storage can throw (private windows, blocked storage), so every access is guarded.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // the page still works; it just won't remember after the tab closes
  }
}

// Browser-only values read through useSyncExternalStore: the server render uses the fallback,
// the browser uses the real value, and React reconciles the two without a hydration error.
const noSubscribe = () => () => {};
const langListeners = new Set<() => void>();
function subscribeLang(listener: () => void) {
  langListeners.add(listener);
  return () => langListeners.delete(listener);
}
let chosenLang: OwnerLang | null = null; // kept in memory too, in case storage is blocked
function savedLang(): OwnerLang {
  if (chosenLang) return chosenLang;
  const saved = read(LANG_KEY);
  return saved === "kn" || saved === "hi" || saved === "en" ? saved : "kn";
}
function saveLang(code: OwnerLang) {
  chosenLang = code;
  write(LANG_KEY, code);
  langListeners.forEach((listener) => listener());
}

export default function OwnerChat() {
  const lang = useSyncExternalStore(subscribeLang, savedLang, () => "kn" as OwnerLang);
  const micAvailable = useSyncExternalStore(noSubscribe, canListen, () => true);
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const token = useRef<string | null>(null);
  const session = useRef<Listening | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const t = LABELS[lang];

  // Restore the conversation.
  // A link like /owner?t=<token> opens that conversation (the demo seed prints one). The token is then
  // removed from the address bar so it isn't shared by accident.
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("t");
    if (fromLink && /^[0-9a-f-]{36}$/.test(fromLink)) {
      write(TOKEN_KEY, fromLink);
      window.history.replaceState(null, "", window.location.pathname);
    }
    token.current = fromLink ?? read(TOKEN_KEY);
  }, []);
  useEffect(() => {
    let cancelled = false;
    canSpeak(lang).then((ok) => !cancelled && setVoiceAvailable(ok));
    return () => {
      cancelled = true;
    };
  }, [lang]);
  // Braces matter: newer Chrome returns a promise from scrollIntoView, and React would treat a returned
  // value as the effect's cleanup function and crash calling it.
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, pending, partial]);
  useEffect(() => () => {
    session.current?.cancel();
    stopSpeaking();
  }, []);

  function chooseLanguage(code: OwnerLang) {
    saveLang(code);
  }

  async function send(body: Record<string, unknown>, shown?: string) {
    if (busy) return;
    stopSpeaking();
    if (shown) setLines((l) => [...l, { from: "owner", text: shown }]);
    setBusy(true);
    setError(null);
    setPending(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token: token.current }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Something went wrong.");
      token.current = result.token;
      write(TOKEN_KEY, result.token);
      if (result.reply) {
        setLines((l) => [...l, { from: "agent", text: result.reply }]);
        speak(result.reply, lang);
      }
      setPending(result.pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      session.current?.finish(); // she says when she is done; pauses don't send
      return;
    }
    stopSpeaking(); // don't let the assistant's voice be picked up by the microphone
    setError(null);
    setPartial("");
    setListening(true);
    session.current = listen(lang, {
      onPartial: setPartial,
      onDone: (text) => {
        setListening(false);
        setPartial("");
        session.current = null;
        if (text) send({ type: "message", text }, text);
        else setError(t.noSpeech);
      },
      onError: (reason) => {
        setListening(false);
        setPartial("");
        session.current = null;
        setError({ "no-permission": t.noPermission, network: t.network, other: t.noMic }[reason]);
      },
    });
  }

  function cancelMic() {
    session.current?.cancel();
    session.current = null;
    setListening(false);
    setPartial("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("text") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    send({ type: "message", text }, text);
  }

  function startOver() {
    stopSpeaking();
    token.current = null;
    write(TOKEN_KEY, null);
    setLines([]);
    setPending(null);
    setError(null);
  }

  return (
    <div className={styles.wrap} lang={lang}>
      <header className={styles.top}>
        <h1>{t.title}</h1>
        <button type="button" className={styles.link} onClick={startOver}>
          {t.startOver}
        </button>
      </header>

      <nav className={styles.languages} aria-label="Language">
        {LANG_NAMES.map((l) => (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={l.code === lang}
            className={l.code === lang ? styles.languageActive : styles.language}
            onClick={() => chooseLanguage(l.code)}
            disabled={listening}
          >
            {l.label}
          </button>
        ))}
      </nav>

      {!voiceAvailable && <p className={styles.notice}>{t.noVoice}</p>}

      <div className={styles.lines} aria-live="polite">
        {lines.length === 0 && <p className={styles.hint}>{t.hint}</p>}
        {lines.map((line, i) =>
          line.from === "owner" ? (
            <p key={i} className={styles.owner}>
              {line.text}
            </p>
          ) : (
            <div key={i} className={styles.agentRow}>
              <p className={styles.agent}>{line.text}</p>
              {voiceAvailable && (
                <button type="button" className={styles.replay} onClick={() => speak(line.text, lang)} aria-label={t.replay}>
                  🔊
                </button>
              )}
            </div>
          ),
        )}
        {listening && <p className={styles.ownerLive}>{partial || "…"}</p>}
        {busy && <p className={styles.agent}>…</p>}
        {pending && (
          <div className={styles.confirm}>
            <button type="button" className={styles.yes} onClick={() => send({ type: "confirm" }, `✓ ${t.yes}`)}>
              ✓ {t.yes}
            </button>
            <button type="button" className={styles.no} onClick={() => send({ type: "cancel" }, `✗ ${t.no}`)}>
              ✗ {t.no}
            </button>
          </div>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <div className={styles.controls}>
        {micAvailable ? (
          <div className={styles.micRow}>
            <button
              type="button"
              className={listening ? styles.micOn : styles.mic}
              onClick={toggleMic}
              disabled={busy}
              aria-pressed={listening}
            >
              <span className={styles.micIcon} aria-hidden="true">
                {listening ? "✓" : "🎤"}
              </span>
              <span>{listening ? t.listening : t.tapToSpeak}</span>
            </button>
            {listening && (
              <button type="button" className={styles.micCancel} onClick={cancelMic} aria-label={t.discard}>
                ✕
              </button>
            )}
          </div>
        ) : (
          <p className={styles.notice}>{t.noMic}</p>
        )}
        <form className={styles.inputBar} onSubmit={submit}>
          <input name="text" autoComplete="off" placeholder={t.typeHere} disabled={busy || listening} maxLength={2000} />
          <button type="submit" disabled={busy || listening}>
            {t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
