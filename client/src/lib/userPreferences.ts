export type PreferredChart = "bars" | "line";
export type DisplayLanguage = "ar" | "en";

export type UserDisplayPreferences = {
  chartType: PreferredChart;
  language: DisplayLanguage;
};

const STORAGE_KEY = "tourism-user-display-preferences";

export const defaultUserDisplayPreferences: UserDisplayPreferences = {
  chartType: "bars",
  language: "ar",
};

export function readUserDisplayPreferences(): UserDisplayPreferences {
  if (typeof window === "undefined") return defaultUserDisplayPreferences;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null") as Partial<UserDisplayPreferences> | null;
    return {
      chartType: parsed?.chartType === "line" ? "line" : "bars",
      language: parsed?.language === "en" ? "en" : "ar",
    };
  } catch {
    return defaultUserDisplayPreferences;
  }
}

export function saveUserDisplayPreferences(next: UserDisplayPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("tourism-user-preferences-changed", { detail: next }));
}

export function applyDisplayLanguage(language: DisplayLanguage) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
}
