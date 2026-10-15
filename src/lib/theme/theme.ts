export type ThemePreference = "light" | "dark" | "system";

const storageKey = "flowai:theme";
const changeEvent = "flowai:theme-changed";

/**
 * Applied to the document element so CSS can swap the palette before the
 * app paints.
 */
export const themeAttribute = "data-theme";

export const THEME_PREFERENCES: {
  value: ThemePreference;
  label: string;
}[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((item) => item.value === value);
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(storageKey);

    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(storageKey, preference);
  } catch {
    /**
     * Private browsing can refuse writes, in which case the theme simply
     * resets next time.
     */
  }

  applyTheme(preference);
  window.dispatchEvent(new Event(changeEvent));
}

/**
 * Resolve the preference to the palette that should be rendered.
 */
export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") {
    return preference;
  }

  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") {
    return;
  }

  const resolved = resolveTheme(preference);

  document.documentElement.setAttribute(themeAttribute, resolved);
  document.documentElement.style.colorScheme = resolved;
}

export function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const media = window.matchMedia("(prefers-color-scheme: light)");

  media.addEventListener("change", callback);
  window.addEventListener(changeEvent, callback);

  return () => {
    media.removeEventListener("change", callback);
    window.removeEventListener(changeEvent, callback);
  };
}

/**
 * Inline script that applies the stored theme before first paint, so
 * the page never flashes the wrong palette.
 */
export const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("${storageKey}");
    var preference =
      stored === "light" || stored === "dark" ? stored : "system";
    var resolved =
      preference === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : preference;
    document.documentElement.setAttribute("${themeAttribute}", resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (error) {}
})();
`;