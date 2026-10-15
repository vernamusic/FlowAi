import type { AiProviderId } from "./types";

const storageKey = "flowai:ai-credentials";
const changeEvent = "flowai:ai-credentials-changed";

export interface AiCredential {
  apiKey: string;
}

export type AiCredentialMap = Record<AiProviderId, AiCredential>;

const emptyCredentials: AiCredentialMap = {};

/**
 * Credentials live in sessionStorage only. They are never written into a
 * workflow, localStorage, or exported JSON.
 */
function isBrowser() {
  return typeof window !== "undefined";
}

function parseCredentials(raw: string): AiCredentialMap {
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
      };
    }

    return result;
  } catch {
    return emptyCredentials;
  }
}

/**
 * Cached snapshot so `useSyncExternalStore` always gets a stable
 * reference for the same stored value.
 */
let cacheRaw: string | null = null;
let cacheValue: AiCredentialMap = emptyCredentials;

export function getAiCredentials(): AiCredentialMap {
  if (!isBrowser()) {
    return emptyCredentials;
  }

  const raw = window.sessionStorage.getItem(storageKey) ?? "";

  if (raw === cacheRaw) {
    return cacheValue;
  }

  cacheRaw = raw;
  cacheValue = parseCredentials(raw);

  return cacheValue;
}

export function getAiCredential(providerId: AiProviderId): AiCredential {
  return getAiCredentials()[providerId] ?? { apiKey: "" };
}

export function getAiApiKey(providerId: AiProviderId): string {
  return getAiCredential(providerId).apiKey;
}

export function setAiCredential(
  providerId: AiProviderId,
  patch: Partial<AiCredential>,
): void {
  if (!isBrowser()) {
    return;
  }

  const current = getAiCredentials();

  const next: AiCredentialMap = {
    ...current,
    [providerId]: {
      apiKey: (patch.apiKey ?? current[providerId]?.apiKey ?? "").trim(),
    },
  };

  window.sessionStorage.setItem(storageKey, JSON.stringify(next));
  window.dispatchEvent(new Event(changeEvent));
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