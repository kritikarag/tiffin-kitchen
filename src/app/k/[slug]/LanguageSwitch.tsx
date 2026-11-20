"use client";

import { useRouter } from "next/navigation";
import { LANG_COOKIE, LANGUAGES, type Lang } from "@/lib/i18n";
import styles from "./menu.module.css";
import Icon from "@/components/Icon";

function saveLanguage(code: Lang) {
  document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
}

// A dropdown of every language. Saves the choice in a cookie and asks the server for the page again in it.
export default function LanguageSwitch({ current }: { current: Lang }) {
  const router = useRouter();

  function choose(code: Lang) {
    saveLanguage(code);
    router.refresh();
  }

  return (
    <label className={styles.languagePick}>
      <span aria-hidden="true"><Icon name="globe" /></span>
      <span className={styles.visuallyHidden}>Language</span>
      <select value={current} onChange={(e) => choose(e.target.value as Lang)}>
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code} lang={language.code}>
            {language.label}
            {language.code === "en" ? "" : ` · ${language.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}
