import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { LanguageSwitcher } from "../features/preferences/LanguageSwitcher.js";
import { I18nProvider } from "./index.js";
import { useI18n } from "./i18n-context.js";
import { detectLocale, LOCALE_STORAGE_KEY } from "./locale-storage.js";
import { translate, type TranslationKey } from "./resources.js";

function TranslationProbe() {
  const { locale, t } = useI18n();

  return (
    <>
      <output>{locale}</output>
      <h1>{t("common", "serviceConnection")}</h1>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.lang = "vi";
});

describe("localization", () => {
  it("detects stored preference, then browser language, then Vietnamese fallback", () => {
    expect(detectLocale("vi", ["en-US"])).toBe("vi");
    expect(detectLocale(null, ["en-US", "vi-VN"])).toBe("en");
    expect(detectLocale(null, ["fr-FR"])).toBe("vi");
  });

  it("switches locale, updates document language, and restores the choice", async () => {
    const user = userEvent.setup();
    const view = render(
      <I18nProvider initialLocale="vi">
        <LanguageSwitcher />
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Kết nối dịch vụ" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Ngôn ngữ" }), "en");

    expect(screen.getByRole("heading", { name: "Service connection" })).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en");

    view.unmount();
    render(
      <I18nProvider>
        <TranslationProbe />
      </I18nProvider>,
    );

    expect(screen.getByText("en")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Service connection" })).toBeVisible();
  });

  it("returns a localized fallback instead of a raw missing key", () => {
    const missingKey = "future.missing" as TranslationKey<"common">;

    expect(translate("en", "common", missingKey)).toBe("Nội dung chưa có");
    expect(translate("en", "common", missingKey)).not.toContain(missingKey);
  });
});
