"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { Lang } from "@/lib/i18n";
import { canListen, listen, type Listening } from "../../owner/voice";
import styles from "./menu.module.css";
import Icon from "@/components/Icon";

const noop = () => () => {};

// A mic beside a text box on the order form, for customers who read their language but don't type it:
// they speak the address or a note ("मूंगफली से एलर्जी है") in the language they chose, and the words land
// in the box, where they can still fix them before ordering. Hidden in browsers without speech input.
// The box is the textarea next to this button, found when it is tapped.
export default function MicButton({ lang, t }: { lang: Lang; t: { speak: string; stop: string; blocked: string } }) {
  const supported = useSyncExternalStore(noop, canListen, () => false);
  const [on, setOn] = useState(false);
  const [problem, setProblem] = useState(false);
  const session = useRef<Listening | null>(null);
  const before = useRef("");
  const box = useRef<HTMLTextAreaElement | null>(null);

  if (!supported) return null;

  function put(text: string) {
    const area = box.current;
    if (!area) return;
    area.value = [before.current, text].filter(Boolean).join(before.current && !before.current.endsWith(" ") ? " " : "");
  }

  function toggle(button: HTMLButtonElement) {
    if (on) {
      session.current?.finish();
      return;
    }
    setProblem(false);
    box.current = button.parentElement?.querySelector("textarea") ?? null;
    before.current = box.current?.value.trim() ?? "";
    setOn(true);
    session.current = listen(lang, {
      onPartial: put,
      onDone: (text) => {
        put(text);
        setOn(false);
        box.current?.focus();
      },
      onError: () => {
        setOn(false);
        setProblem(true);
      },
    });
  }

  return (
    <>
      <button type="button" className={on ? styles.micOn : styles.mic} onClick={(e) => toggle(e.currentTarget)} aria-pressed={on} aria-label={on ? t.stop : t.speak} title={on ? t.stop : t.speak}>
        <Icon name={on ? "check" : "mic"} />
      </button>
      {problem && <span className={styles.micProblem}>{t.blocked}</span>}
    </>
  );
}
