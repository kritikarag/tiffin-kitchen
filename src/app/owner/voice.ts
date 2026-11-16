// Voice in the browser, with no server or extra service:
// - SpeechRecognition turns the owner's speech into text (Chrome sends the audio to Google to do this).
// - speechSynthesis reads the agent's replies aloud using voices installed on the phone.
// Both vary by browser and phone, so every function here reports whether it worked and the page
// falls back to typing and reading.

export type OwnerLang = "kn" | "hi" | "en";

// BCP-47 tags the speech APIs expect. "-IN" picks Indian English and the Indian variants.
export const SPEECH_TAG: Record<OwnerLang, string> = { kn: "kn-IN", hi: "hi-IN", en: "en-IN" };

// Minimal types: TypeScript's DOM library does not include the speech recognition API yet.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return recognitionConstructor() !== null;
}

export type ListenHandlers = {
  onPartial: (text: string) => void; // words so far, shown live while she speaks
  onDone: (text: string) => void; // final text; empty if nothing was heard
  onError: (reason: "no-permission" | "no-speech" | "network" | "other") => void;
};

// Starts listening and returns a function that stops it. Recognition ends by itself after a pause.
export function listen(lang: OwnerLang, handlers: ListenHandlers): () => void {
  const Ctor = recognitionConstructor();
  if (!Ctor) {
    handlers.onError("other");
    return () => {};
  }
  const recognition = new Ctor();
  recognition.lang = SPEECH_TAG[lang];
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  let finalText = "";
  let failed = false;
  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    handlers.onPartial((finalText + interim).trim());
  };
  recognition.onerror = (event) => {
    if (event.error === "aborted") return;
    failed = true;
    const reason =
      event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "no-permission"
        : event.error === "no-speech"
          ? "no-speech"
          : event.error === "network"
            ? "network"
            : "other";
    handlers.onError(reason);
  };
  recognition.onend = () => {
    if (!failed) handlers.onDone(finalText.trim());
  };
  recognition.start();
  return () => recognition.stop(); // stop() still delivers what was heard; abort() would discard it
}

// ---- speaking ----

let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

// The voice list loads asynchronously in Chrome, so wait for it once.
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve([]);
  voicesReady ??= new Promise((resolve) => {
    const now = window.speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500); // some browsers never fire the event
  });
  return voicesReady;
}

async function voiceFor(lang: OwnerLang): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices();
  const tag = SPEECH_TAG[lang].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase().replace("_", "-") === tag) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  );
}

export async function canSpeak(lang: OwnerLang): Promise<boolean> {
  return (await voiceFor(lang)) !== null;
}

// Reads text aloud. Resolves false when the phone has no voice for this language,
// so the page can say "reply shown as text" instead of staying silent without explanation.
export async function speak(text: string, lang: OwnerLang): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return false;
  const voice = await voiceFor(lang);
  if (!voice) return false;
  window.speechSynthesis.cancel(); // stop anything still playing
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.95; // a little slower than default is easier to follow
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
