"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import {
  readThemePreference,
  subscribeToTheme,
  THEME_PREFERENCES,
  writeThemePreference,
  type ThemePreference,
} from "@/lib/theme/theme";

const icons: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const labels: Record<ThemePreference, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

function getSnapshot() {
  return readThemePreference();
}

export function ThemeToggle() {
  const preference = useSyncExternalStore(
    subscribeToTheme,
    getSnapshot,
    () => "system" as ThemePreference,
  );

  /**
   * Cycling keeps it to a single tap on a phone, and the title always
   * says what the next tap does.
   */
  const cycle = () => {
    const index = THEME_PREFERENCES.findIndex(
      (item) => item.value === preference,
    );
    const next = THEME_PREFERENCES[(index + 1) % THEME_PREFERENCES.length];

    writeThemePreference(next.value);
  };

  const Icon = icons[preference];
  const next = THEME_PREFERENCES.find((item) => item.value === preference);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${preference}. Switch to ${next?.label.toLowerCase() ?? "next theme"}.`}
      title={`Theme: ${labels[preference]}`}
      data-theme-value={preference}
      className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}