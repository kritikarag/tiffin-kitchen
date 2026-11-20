"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { canListen, canSpeak, listen, speak, stopSpeaking, type Listening, type OwnerLang } from "./voice";
import type { AgentStep } from "@/lib/agent";
import AgentSteps from "./AgentSteps";
import CameraSheet from "./CameraSheet";
import KitchenLink from "./KitchenLink";
import NewOrderAlert from "./NewOrderAlert";
import OrdersSheet from "./OrdersSheet";
import { preparePhoto, type PhotoForUpload } from "./photo";
import styles from "./owner.module.css";
import { ownerLabels } from "./labels";
import { isLang, LANGUAGES } from "@/lib/i18n";

type Line = { from: "owner" | "agent"; text: string; photo?: string; steps?: AgentStep[] };
type Pending = { name: string; summary: Record<string, unknown> } | null;

const TOKEN_KEY = "tiffin-owner-token";
const LANG_KEY = "tiffin-owner-lang";


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
  return isLang(saved) ? saved : "en";
}
function saveLang(code: OwnerLang) {
  chosenLang = code;
  write(LANG_KEY, code);
  langListeners.forEach((listener) => listener());
}

export default function OwnerChat() {
  const lang = useSyncExternalStore(subscribeLang, savedLang, () => "en" as OwnerLang);
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
  const t = ownerLabels(lang);
  // Stable, so the new-order alert keeps one timer across renders.
  const getToken = useCallback(() => token.current, []);

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
      if (result.reply || result.steps?.length) {
        setLines((l) => [...l, { from: "agent", text: result.reply, steps: result.steps }]);
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
          tidyAndAdd(text);
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

  // The browser's recognition often mishears dish names, so the words are first tidied by Claude
  // (see /api/transcript). If that is slow or fails, her words go into the box exactly as heard.
  const [tidying, setTidying] = useState(false);
  async function tidyAndAdd(heard: string) {
    setTidying(true);
    let text = heard;
    try {
      const response = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: heard, token: token.current }),
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) text = (await response.json()).text || heard;
    } catch {
      // keep what was heard
    } finally {
      setTidying(false);
    }
    setDraft((d) => (d.trim() ? `${d.trim()} ${text}` : text));
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
  // The conversation token when the Orders screen was opened (refs can't be read while rendering).
  const [ordersToken, setOrdersToken] = useState<string | null | undefined>(undefined);

  function sendPhotoData(photo: PhotoForUpload) {
    const note = draft.trim();
    setDraft("");
    send({ type: "message", text: note, image: { media_type: photo.media_type, data: photo.data } }, note || t.photoSent, photo.previewUrl);
  }

  const [dragging, setDragging] = useState(false);

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
    <div
      className={dragging ? styles.wrapDrop : styles.wrap}
      lang={lang}
      // On a laptop she can also drag a photo of her menu onto the page.
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragging(false);
        sendPhoto([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")));
      }}
    >
      {dragging && <div className={styles.dropHint}>🖼 {t.dropPhoto}</div>}
      <header className={styles.top}>
        <h1>{t.title}</h1>
        <button type="button" className={styles.link} onClick={startOver}>
          {t.startOver}
        </button>
      </header>
      <button type="button" className={styles.ordersButton} onClick={() => setOrdersToken(token.current)}>
        📋 {t.ordersButton}
      </button>
      <NewOrderAlert getToken={getToken} lang={lang} t={t} onOpenOrders={() => setOrdersToken(token.current)} />
      <KitchenLink getToken={getToken} t={t} refreshKey={lines.length} />

      <label className={styles.languagePick}>
        <span aria-hidden="true">🌐</span>
        <span className={styles.visuallyHidden}>Language</span>
        <select value={lang} onChange={(e) => chooseLanguage(e.target.value as OwnerLang)} disabled={listening}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.label}
              {l.code === "en" ? "" : ` · ${l.name}`}
            </option>
          ))}
        </select>
      </label>

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
              <div className={styles.agentBlock}>
                {line.steps && <AgentSteps steps={line.steps} lang={lang} />}
                {line.text && <p className={styles.agent}>{line.text}</p>}
              </div>
              {voiceAvailable && line.text && (
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

      {ordersToken !== undefined && <OrdersSheet token={ordersToken} lang={lang} t={t} onClose={() => setOrdersToken(undefined)} />}

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
                  <span className={styles.photoLabel}>{t.takePhotoShort}</span>
                </button>
                <button
                  type="button"
                  className={styles.photoButton}
                  onClick={() => {
                    stopSpeaking();
                    setError(null);
                    photoInput.current?.click();
                  }}
                  disabled={busy}
                  aria-label={t.uploadPhoto}
                  title={t.uploadPhoto}
                >
                  <span aria-hidden="true">🖼</span>
                  <span className={styles.photoLabel}>{t.uploadShort}</span>
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
        {tidying && <p className={styles.draftHint}>{t.tidying}</p>}
        {draft && !listening && !tidying && <p className={styles.draftHint}>{t.checkAndSend}</p>}
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
            disabled={busy || listening || tidying}
            maxLength={2000}
          />
          <button type="submit" disabled={busy || listening || tidying || !draft.trim()}>
            {t.send}
          </button>
        </form>
      </div>
    </div>
  );
}
