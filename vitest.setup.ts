import { cleanup } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, vi } from "vitest";

/**
 * The app runs entirely in a browser, so the test environment has to look
 * like one.
 *
 * Storage is provided here rather than relying on jsdom: Node ships an
 * experimental `localStorage` that shadows it, and the suite needs a
 * predictable implementation it can also fail on demand.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number) {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }

  /** Entries in insertion order, which the app relies on for keys. */
  keys() {
    return [...this.store.keys()];
  }
}

function installStorage(name: "localStorage" | "sessionStorage") {
  const storage = new MemoryStorage();

  Object.defineProperty(globalThis, name, {
    value: storage,
    configurable: true,
    writable: true,
  });

  if (typeof window !== "undefined") {
    Object.defineProperty(window, name, {
      value: storage,
      configurable: true,
      writable: true,
    });
  }

  return storage;
}

installStorage("localStorage");
installStorage("sessionStorage");

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();

  if (!globalThis.crypto?.randomUUID) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true,
    });
  }

  if (!navigator.clipboard) {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  }
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});