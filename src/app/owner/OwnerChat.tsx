"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { canListen, canSpeak, listen, speak, stopSpeaking, type Listening, type OwnerLang } from "./voice";
import CameraSheet from "./CameraSheet";
import { preparePhoto, type PhotoForUpload } from "./photo";
import styles from "./owner.module.css";

type Line = { from: "owner" | "agent"; text: string; photo?: string };
type Pending = { name: string; summary: Record<string, unknown> } | null;

const TOKEN_KEY = "tiffin-owner-token";
const LANG_KEY = "tiffin-owner-lang";

// The owner's screen labels. Kept short and paired with icons, since she may not read comfortably.
const LABELS: Record<OwnerLang, Record<string, string>> = {
  en: {
    title: "Your kitchen assistant",
    startOver: "Start over",
    hint: "Tap the microphone and tell me about the tiffin service you want to start. You can also send a photo of your menu with 📷.",
    tapToSpeak: "Tap to speak",
    listening: "Listening… tap when you're done",
    discard: "Discard recording",
    photo: "Send a photo of your menu",
    cameraTitle: "Photo of your menu",
    takePhoto: "Take photo",
    usePhoto: "Use photo",
    retake: "Retake",
    fromGallery: "Choose from gallery instead",
    close: "Close",
    cameraBlocked: "The camera isn't available here. Allow camera access for this page, or choose a photo from your gallery.",
    photoSent: "Photo of my menu",
    photoError: "That photo could not be opened. Please try another photo.",
    yes: "Yes",
    no: "No",
    typeHere: "Type, or tap the mic…",
    checkAndSend: "Check the words, fix anything wrong, then tap Send.",
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
    hint: "माइक दबाइए और बताइए आप कैसी टिफ़िन सेवा शुरू करना चाहती हैं। 📷 से अपने मेन्यू की फ़ोटो भी भेज सकती हैं।",
    tapToSpeak: "बोलने के लिए दबाएँ",
    listening: "सुन रही हूँ… बोल लें तो दबाएँ",
    discard: "रिकॉर्डिंग हटाएँ",
    photo: "मेन्यू की फ़ोटो भेजें",
    cameraTitle: "आपके मेन्यू की फ़ोटो",
    takePhoto: "फ़ोटो लें",
    usePhoto: "यह फ़ोटो भेजें",
    retake: "फिर से लें",
    fromGallery: "गैलरी से चुनें",
    close: "बंद करें",
    cameraBlocked: "यहाँ कैमरा नहीं खुला। इस पेज को कैमरे की अनुमति दें, या गैलरी से फ़ोटो चुनें।",
    photoSent: "मेरे मेन्यू की फ़ोटो",
    photoError: "यह फ़ोटो नहीं खुली। कृपया दूसरी फ़ोटो चुनें।",
    yes: "हाँ",
    no: "नहीं",
    typeHere: "लिखें, या माइक दबाएँ…",
    checkAndSend: "शब्द जाँच लें, कुछ गलत हो तो ठीक करें, फिर भेजें दबाएँ।",
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
    hint: "ಮೈಕ್ ಒತ್ತಿ, ನೀವು ಶುರು ಮಾಡಬೇಕಾದ ಟಿಫಿನ್ ಸೇವೆಯ ಬಗ್ಗೆ ಹೇಳಿ. 📷 ಮೂಲಕ ನಿಮ್ಮ ಮೆನು ಫೋಟೋ ಕೂಡ ಕಳುಹಿಸಬಹುದು.",
    tapToSpeak: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ… ಮುಗಿದ ಮೇಲೆ ಒತ್ತಿ",
    discard: "ರೆಕಾರ್ಡಿಂಗ್ ಅಳಿಸಿ",
    photo: "ಮೆನು ಫೋಟೋ ಕಳುಹಿಸಿ",
    cameraTitle: "ನಿಮ್ಮ ಮೆನು ಫೋಟೋ",
    takePhoto: "ಫೋಟೋ ತೆಗೆಯಿರಿ",
    usePhoto: "ಈ ಫೋಟೋ ಕಳುಹಿಸಿ",
    retake: "ಮತ್ತೆ ತೆಗೆಯಿರಿ",
    fromGallery: "ಗ್ಯಾಲರಿಯಿಂದ ಆಯ್ಕೆ ಮಾಡಿ",
    close: "ಮುಚ್ಚಿ",
    cameraBlocked: "ಇಲ್ಲಿ ಕ್ಯಾಮೆರಾ ತೆರೆಯಲಿಲ್ಲ. ಈ ಪುಟಕ್ಕೆ ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ನೀಡಿ, ಅಥವಾ ಗ್ಯಾಲರಿಯಿಂದ ಫೋಟೋ ಆಯ್ಕೆ ಮಾಡಿ.",
    photoSent: "ನನ್ನ ಮೆನು ಫೋಟೋ",
    photoError: "ಈ ಫೋಟೋ ತೆರೆಯಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬೇರೆ ಫೋಟೋ ಆಯ್ಕೆ ಮಾಡಿ.",
    yes: "ಹೌದು",
    no: "ಬೇಡ",
    typeHere: "ಬರೆಯಿರಿ, ಅಥವಾ ಮೈಕ್ ಒತ್ತಿ…",
    checkAndSend: "ಪದಗಳನ್ನು ನೋಡಿ, ತಪ್ಪಿದ್ದರೆ ಸರಿಪಡಿಸಿ, ನಂತರ ಕಳುಹಿಸಿ ಒತ್ತಿ.",
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
  // The message box. Speech lands here too, so she can correct misheard words before sending.
  const [draft, setDraft] = useState("");
  const draftBox = useRef<HTMLTextAreaElement>(null);
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

  async function send(body: Record<string, unknown>, shown?: string, photo?: string) {
    if (busy) return;
    stopSpeaking();
    if (shown || photo) setLines((l) => [...l, { from: "owner", text: shown ?? "", photo }]);
    setBusy(true);
    setError(null);
    setPending(null);
    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, token: token.current, language: lang }),
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
        if (text) {
          // Not sent yet: it goes into the box to check and edit, then she taps Send.
          // No automatic focus: on a phone it would pop up the keyboard even when nothing needs fixing.
          setDraft((d) => (d.trim() ? `${d.trim()} ${text}` : text));
        } else {
          setError(t.noSpeech);
        }
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

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    send({ type: "message", text }, text);
  }

  // A photo of her menu goes with whatever is in the message box, so she can add a note such as
  // "this is my menu" or "today's menu".
  const photoInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  function sendPhotoData(photo: PhotoForUpload) {
    const note = draft.trim();
    setDraft("");
    send({ type: "message", text: note, image: { media_type: photo.media_type, data: photo.data } }, note || t.photoSent, photo.previewUrl);
  }

  async function sendPhoto(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    try {
      sendPhotoData(await preparePhoto(file));
    } catch {
      setError(t.photoError);
    } finally {
      if (photoInput.current) photoInput.current.value = ""; // so the same photo can be chosen again
    }
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
            <div key={i} className={styles.ownerRow}>
              {line.photo && (
                // eslint-disable-next-line @next/next/no-img-element -- a local preview, not a page image
                <img src={line.photo} alt={t.photoSent} className={styles.photo} />
              )}
              {line.text && <p className={styles.owner}>{line.text}</p>}
            </div>
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

      {cameraOpen && (
        <CameraSheet
          t={t}
          onPhoto={(photo) => {
            setCameraOpen(false);
            sendPhotoData(photo);
          }}
          onGallery={() => {
            setCameraOpen(false);
            photoInput.current?.click();
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

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
            {!listening && (
              <>
                <button
                  type="button"
                  className={styles.photoButton}
                  onClick={() => {
                    stopSpeaking();
                    setError(null);
                    setCameraOpen(true);
                  }}
                  disabled={busy}
                  aria-label={t.photo}
                  title={t.photo}
                >
                  <span aria-hidden="true">📷</span>
                </button>
                {/* No "capture" attribute, so the phone offers both the camera and the gallery. */}
                <input ref={photoInput} type="file" accept="image/*" hidden onChange={(e) => sendPhoto(e.target.files?.[0])} />
              </>
            )}
            {listening && (
              <button type="button" className={styles.micCancel} onClick={cancelMic} aria-label={t.discard}>
                ✕
              </button>
            )}
          </div>
        ) : (
          <p className={styles.notice}>{t.noMic}</p>
        )}
        {draft && !listening && <p className={styles.draftHint}>{t.checkAndSend}</p>}
        <form className={styles.inputBar} onSubmit={submit}>
          <textarea
            ref={draftBox}
            name="text"
            rows={draft ? Math.min(5, Math.max(2, Math.ceil(draft.length / 26))) : 1} // grows with the text so all of it is visible
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line, as in most chat apps.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            autoComplete="off"
            placeholder={draft ? undefined : t.typeHere}
            disabled={busy || listening}
            maxLength={2000}
          />
          <button type="submit" disabled={busy || listening || !draft.trim()}>
            {t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
