import type { AiProviderId } from "./types";

/**
 * Credentials never go into a workflow or an export. Where they sit is
 * the user's call:
 *
 * - sessionStorage, the default, which forgets them when the tab closes
 * - localStorage, only when the user explicitly asks to remember them
 */

const sessionKey = "flowai:ai-credentials";
const rememberedKey = "flowai:ai-credentials-remembered";
const changeEvent = "flowai:ai-credentials-changed";

export interface AiCredential {
  apiKey: string;

  /** True when the user chose to keep this key between sessions. */
  remembered: boolean;
}

export type AiCredentialMap = Record<AiProviderId, AiCredential>;

const emptyCredentials: AiCredentialMap = {};

function isBrowser() {
  return typeof window !== "undefined";
}

function parseCredentials(raw: string, remembered: boolean): AiCredentialMap {
  if (!raw) {
    return emptyCredentials;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return emptyCredentials;
    }

    const result: AiCredentialMap = {};

    for (const [providerId, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      if (!value || typeof value !== "object") {
        continue;
      }

      const credential = value as Partial<AiCredential>;

      result[providerId] = {
        apiKey: typeof credential.apiKey === "string" ? credential.apiKey : "",
        remembered: remembered || credential.remembered === true,
      };
    }

    return result;
  } catch {
    return emptyCredentials;
  }
}

function readStore(store: "session" | "local"): AiCredentialMap {
  if (!isBrowser()) return emptyCredentials;

  const target = store === "session" ? window.sessionStorage : window.localStorage;

  try {
    return parseCredentials(
      target.getItem(store === "session" ? sessionKey : rememberedKey) ?? "",
      store === "local",
    );
  } catch {
    return emptyCredentials;
  }
}

/**
 * Cached snapshot so `useSyncExternalStore` always gets a stable
 * reference for the same stored value.
 */
let cacheSessionRaw: string | null = null;
let cacheLocalRaw: string | null = null;
let cacheValue: AiCredentialMap = emptyCredentials;

export function getAiCredentials(): AiCredentialMap {
  if (!isBrowser()) {
    return emptyCredentials;
  }

  const sessionRaw = window.sessionStorage.getItem(sessionKey) ?? "";
  const localRaw = window.localStorage.getItem(rememberedKey) ?? "";

  if (sessionRaw === cacheSessionRaw && localRaw === cacheLocalRaw) {
    return cacheValue;
  }

  /**
   * The session wins, because a key typed in this tab is the most
   * deliberate thing the user has done.
   */
  const merged: AiCredentialMap = {
    ...readStore("local"),
    ...readStore("session"),
  };

  cacheSessionRaw = sessionRaw;
  cacheLocalRaw = localRaw;
  cacheValue = merged;

  return merged;
}

export function getAiCredential(providerId: AiProviderId): AiCredential {
  return getAiCredentials()[providerId] ?? { apiKey: "", remembered: false };
}

export function getAiApiKey(providerId: AiProviderId): string {
  return getAiCredential(providerId).apiKey;
}

/**
 * Whether this provider's key is kept between sessions.
 */
export function isAiCredentialRemembered(providerId: AiProviderId): boolean {
  return getAiCredential(providerId).remembered;
}

/**
 * Providers with a key the user chose to remember, for the settings page.
 */
export function getRememberedProviderIds(): AiProviderId[] {
  return Object.entries(getAiCredentials())
    .filter(([, credential]) => credential.remembered && credential.apiKey)
    .map(([providerId]) => providerId as AiProviderId);
}

export function setAiCredential(
  providerId: AiProviderId,
  patch: Partial<AiCredential>,
): void {
  if (!isBrowser()) {
    return;
  }

  const current = getAiCredentials();
  const apiKey = (patch.apiKey ?? current[providerId]?.apiKey ?? "").trim();
  const remembered =
    patch.remembered ?? current[providerId]?.remembered ?? false;

  const session = { ...readStore("session") };
  const local = { ...readStore("local") };

  /**
   * A key lives in exactly one place, so turning the setting off really
   * moves it back rather than leaving a copy behind.
   */
  if (remembered) {
    delete session[providerId];
    local[providerId] = { apiKey, remembered: true };
  } else {
    delete local[providerId];
    session[providerId] = { apiKey, remembered: false };
  }

  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
    window.localStorage.setItem(rememberedKey, JSON.stringify(local));
  } catch {
    /**
     * Private browsing can refuse writes. The key still works for this
     * tab, it simply will not be remembered.
     */
  }

  /**
   * The cached snapshot is built from raw strings, and storage did not
   * throw, so the next read will pick this up. Dispatching tells React
   * to look.
   */
  window.dispatchEvent(new Event(changeEvent));
}

export function forgetAiCredential(providerId: AiProviderId): void {
  const session = { ...readStore("session") };
  const local = { ...readStore("local") };

  delete session[providerId];
  delete local[providerId];

  try {
    window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
    window.localStorage.setItem(rememberedKey, JSON.stringify(local));
  } catch {
    // nothing to do; the value is gone either way once storage recovers
  }

  window.dispatchEvent(new Event(changeEvent));
}

/**
 * Drop every key the user asked to remember, without touching the ones
 * that only live in this tab.
 */
export function forgetRememberedCredentials(): AiProviderId[] {
  const forgotten = getRememberedProviderIds();

  for (const providerId of forgotten) {
    forgetAiCredential(providerId);
  }

  return forgotten;
}

export function subscribeToAiCredentials(callback: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  window.addEventListener(changeEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(changeEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getAiCredentialsServerSnapshot(): AiCredentialMap {
  return emptyCredentials;
}

/** Exposed so the settings page can tell the user what it would clear. */
export const rememberedCredentialStorageKey = rememberedKey;