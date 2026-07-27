import { useI18n } from "../../i18n/i18n-context.js";
import { isLocale } from "../../i18n/locale-storage.js";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="language-switcher">
      <span className="sr-only">{t("common", "languageLabel")}</span>
      <select
        aria-label={t("common", "languageLabel")}
        onChange={(event) => {
          if (isLocale(event.target.value)) {
            setLocale(event.target.value);
          }
        }}
        value={locale}
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
