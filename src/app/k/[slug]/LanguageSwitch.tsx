"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANGUAGES, type Lang } from "@/lib/i18n";
import styles from "./menu.module.css";

function saveLanguage(code: Lang) {
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

// Saves the choice in a cookie and asks the server for the page again in that language.
export default function LanguageSwitch({ current }: { current: Lang }) {
  const router = useRouter();

  function choose(code: Lang) {
    saveLanguage(code);
    router.refresh();
  }

  return (
    <nav className={styles.languages} aria-label="Language">
      {LANGUAGES.map((language) => (
        <button
          key={language.code}
          type="button"
          lang={language.code}
          aria-pressed={language.code === current}
          className={language.code === current ? styles.languageActive : styles.language}
          onClick={() => choose(language.code)}
        >
          {language.label}
        </button>
      ))}
    </nav>
  );
}
