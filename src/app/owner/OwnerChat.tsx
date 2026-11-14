"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./owner.module.css";

type Line = { from: "owner" | "agent"; text: string };
type Pending = { name: string; summary: Record<string, unknown> } | null;

const TOKEN_KEY = "tiffin-owner-token";

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private window: the conversation still works until the tab closes
  }
}

export default function OwnerChat() {
  const [lines, setLines] = useState<Line[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    token.current = readToken();
  }, []);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [lines, pending]);

  async function send(body: Record<string, unknown>, shown?: string) {
    if (busy) return;
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
      writeToken(result.token);
      if (result.reply) setLines((l) => [...l, { from: "agent", text: result.reply }]);
      setPending(result.pending);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
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
    token.current = null;
    writeToken(null);
    setLines([]);
    setPending(null);
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.top}>
        <h1>Your kitchen assistant</h1>
        <button type="button" className={styles.link} onClick={startOver}>
          Start over
        </button>
      </header>

      <div className={styles.lines} aria-live="polite">
        {lines.length === 0 && <p className={styles.hint}>Tell me about the tiffin service you want to start.</p>}
        {lines.map((line, i) => (
          <p key={i} className={line.from === "owner" ? styles.owner : styles.agent}>
            {line.text}
          </p>
        ))}
        {busy && <p className={styles.agent}>…</p>}
        {pending && (
          <div className={styles.confirm}>
            <button type="button" className={styles.yes} onClick={() => send({ type: "confirm" }, "✓")}>
              ✓ Yes
            </button>
            <button type="button" className={styles.no} onClick={() => send({ type: "cancel" }, "✗")}>
              ✗ No
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

      <form className={styles.inputBar} onSubmit={submit}>
        <input name="text" autoComplete="off" placeholder="Type here…" disabled={busy} maxLength={2000} />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}
