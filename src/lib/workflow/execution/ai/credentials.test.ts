import { beforeEach, describe, expect, it } from "vitest";

import {
  forgetAiCredential,
  forgetRememberedCredentials,
  getAiApiKey,
  getAiCredential,
  getAiCredentials,
  getRememberedProviderIds,
  isAiCredentialRemembered,
  setAiCredential,
} from "@/lib/workflow/execution/ai/credentials";

const sessionKey = "flowai:ai-credentials";
const rememberedKey = "flowai:ai-credentials-remembered";

beforeEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
});

describe("session credentials", () => {
  it("starts empty", () => {
    expect(getAiApiKey("openai")).toBe("");
    expect(getAiCredential("openai").remembered).toBe(false);
  });

  it("keeps a key in the session by default", () => {
    setAiCredential("openai", { apiKey: "sk-test" });

    expect(getAiApiKey("openai")).toBe("sk-test");
    expect(isAiCredentialRemembered("openai")).toBe(false);
    expect(window.sessionStorage.getItem(sessionKey)).toContain("sk-test");
    expect(window.localStorage.getItem(rememberedKey)).not.toContain("sk-test");
  });

  it("trims what is typed", () => {
    setAiCredential("openai", { apiKey: "  sk-test  " });

    expect(getAiApiKey("openai")).toBe("sk-test");
  });
});

describe("remembered credentials", () => {
  it("moves the key into local storage when asked", () => {
    setAiCredential("openai", { apiKey: "sk-test", remembered: true });

    expect(getAiApiKey("openai")).toBe("sk-test");
    expect(isAiCredentialRemembered("openai")).toBe(true);
    expect(window.localStorage.getItem(rememberedKey)).toContain("sk-test");

    /**
     * One copy, not two: a key that is remembered is not also sitting in
     * the session store waiting to be leaked somewhere else.
     */
    expect(window.sessionStorage.getItem(sessionKey)).not.toContain("sk-test");
  });

  it("still updates a remembered key when it is typed again", () => {
    setAiCredential("openai", { apiKey: "sk-one", remembered: true });
    setAiCredential("openai", { apiKey: "sk-two" });

    expect(getAiApiKey("openai")).toBe("sk-two");
    expect(isAiCredentialRemembered("openai")).toBe(true);
  });

  it("moves the key back to the session when unremembered", () => {
    setAiCredential("openai", { apiKey: "sk-test", remembered: true });
    setAiCredential("openai", { remembered: false });

    expect(isAiCredentialRemembered("openai")).toBe(false);
    expect(window.localStorage.getItem(rememberedKey)).not.toContain("sk-test");
    expect(getAiApiKey("openai")).toBe("sk-test");
  });

  it("lists which providers are remembered", () => {
    setAiCredential("openai", { apiKey: "sk-openai", remembered: true });
    setAiCredential("ollama", { apiKey: "" });
    setAiCredential("openrouter", { apiKey: "sk-or", remembered: true });

    expect(getRememberedProviderIds().sort()).toEqual(["openai", "openrouter"]);
  });

  it("keeps keys for different providers apart", () => {
    setAiCredential("openai", { apiKey: "sk-openai", remembered: true });
    setAiCredential("openrouter", { apiKey: "sk-or" });

    expect(getAiApiKey("openai")).toBe("sk-openai");
    expect(getAiApiKey("openrouter")).toBe("sk-or");
  });
});

describe("forgetting", () => {
  it("removes one provider's key from both places", () => {
    setAiCredential("openai", { apiKey: "sk-one", remembered: true });
    setAiCredential("openrouter", { apiKey: "sk-two", remembered: true });

    forgetAiCredential("openai");

    expect(getAiApiKey("openai")).toBe("");
    expect(getAiApiKey("openrouter")).toBe("sk-two");
  });

  it("forgets every remembered key and leaves session ones alone", () => {
    setAiCredential("openai", { apiKey: "sk-remembered", remembered: true });
    setAiCredential("ollama", { apiKey: "sk-session" });

    expect(forgetRememberedCredentials()).toEqual(["openai"]);

    expect(getAiCredentials()["openai"]).toBeUndefined();
    expect(getAiApiKey("ollama")).toBe("sk-session");
  });
});