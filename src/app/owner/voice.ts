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
  onPartial: (text: string) => void; // everything heard so far, shown live while she speaks
  onDone: (text: string) => void; // final text when she taps stop; empty if nothing was heard
  onError: (reason: "no-permission" | "network" | "other") => void;
};

export type Listening = {
  finish: () => void; // she tapped stop: send what was heard
  cancel: () => void; // she tapped ✕: discard it
};

// Listens until she taps stop, however long she pauses.
// Browsers end a recognition session by themselves after a pause, so when that happens and she hasn't
// tapped stop, a new session starts at once and its words are added to what was already heard.
// (continuous mode would avoid the restarts, but Chrome on Android repeats words in that mode.)
export function listen(lang: OwnerLang, handlers: ListenHandlers): Listening {
  const Ctor = recognitionConstructor();
  if (!Ctor) {
    handlers.onError("other");
    return { finish: () => {}, cancel: () => {} };
  }

  let heard = ""; // text from finished sessions
  let current = ""; // final text from the session that is running
  let interim = "";
  let state: "listening" | "finishing" | "cancelled" | "done" = "listening";
  let recognition: Recognition | null = null;

  const all = () => [heard, current, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  function finishNow() {
    if (state === "done" || state === "cancelled") return;
    state = "done";
    handlers.onDone([heard, current, interim].filter(Boolean).join(" ").replace(/\s+/g, " ").trim());
  }

  function startSession() {
    const r = new Ctor!();
    recognition = r;
    r.lang = SPEECH_TAG[lang];
    r.interimResults = true;
    r.continuous = false;
    r.maxAlternatives = 1;
    current = "";
    interim = "";
    r.onresult = (event) => {
      let finals = "";
      let partial = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finals += result[0].transcript;
        else partial += result[0].transcript;
      }
      current = finals.trim();
      interim = partial.trim();
      handlers.onPartial(all());
    };
    r.onerror = (event) => {
      // A pause with no speech, or the session being stopped, is normal here: the session just ends.
      if (event.error === "no-speech" || event.error === "aborted") return;
      state = "cancelled";
      handlers.onError(
        event.error === "not-allowed" || event.error === "service-not-allowed" ? "no-permission" : event.error === "network" ? "network" : "other",
      );
    };
    r.onend = () => {
      heard = [heard, current].filter(Boolean).join(" ");
      current = "";
      if (state === "listening") {
        interim = "";
        startSession(); // she paused but hasn't tapped stop: keep listening
      } else if (state === "finishing") {
        finishNow();
      }
    };
    r.start();
  }

  startSession();
  return {
    finish: () => {
      if (state !== "listening") return;
      state = "finishing";
      recognition?.stop(); // stop() still delivers the last words, then onend sends everything
      setTimeout(finishNow, 1500); // in case the browser never fires onend
    },
    cancel: () => {
      if (state === "done" || state === "cancelled") return;
      state = "cancelled";
      recognition?.abort();
    },
  };
}

// ---- speaking ----

// On many phones the voice list is empty when the page loads and fills in later, sometimes only after
// the first speech. So the list is read fresh each time, and an empty list means "unknown", not "none".
function currentVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices();
}

// Waits briefly for the list the first time a page asks; later calls return at once.
let waited = false;
async function voices(): Promise<SpeechSynthesisVoice[]> {
  const now = currentVoices();
  if (now.length || waited || typeof window === "undefined" || !("speechSynthesis" in window)) return now;
  waited = true;
  await new Promise<void>((resolve) => {
    window.speechSynthesis.addEventListener("voiceschanged", () => resolve(), { once: true });
    setTimeout(resolve, 1500); // some browsers never fire the event
  });
  return currentVoices();
}

function match(list: SpeechSynthesisVoice[], lang: OwnerLang): SpeechSynthesisVoice | null {
  const tag = SPEECH_TAG[lang].toLowerCase();
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace(/_/g, "-");
  return list.find((v) => norm(v) === tag) ?? list.find((v) => norm(v).startsWith(`${lang}-`) || norm(v) === lang) ?? null;
}

// False only when the phone lists its voices and none is for this language.
// An empty list says nothing, so the page doesn't show a warning in that case.
export async function canSpeak(lang: OwnerLang): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const list = await voices();
  return list.length === 0 || match(list, lang) !== null;
}

// Reads text aloud. With a matching voice it uses that voice; with an empty list it still speaks and
// sets the language, so the phone's own text-to-speech picks a voice. Resolves false only when the
// phone lists voices and none is for this language.
export async function speak(text: string, lang: OwnerLang): Promise<boolean> {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return false;
  const list = await voices();
  const voice = match(list, lang);
  if (list.length > 0 && !voice) return false;
  window.speechSynthesis.cancel(); // stop anything still playing
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? SPEECH_TAG[lang];
  utterance.rate = 0.95; // a little slower than default is easier to follow
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}
