const storageKey = "flowai:openai-api-key";
const changeEvent = "flowai:openai-api-key-changed";

interface OpenAIResponse {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: { message?: string };
}

export function getOpenAiApiKey() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(storageKey) ?? "";
}

export function setOpenAiApiKey(key: string) {
  if (typeof window === "undefined") return;
  const value = key.trim();
  if (value) window.sessionStorage.setItem(storageKey, value);
  else window.sessionStorage.removeItem(storageKey);
  window.dispatchEvent(new Event(changeEvent));
}

export function subscribeToOpenAiApiKey(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}

function getOutputText(response: OpenAIResponse) {
  if (response.output_text?.trim()) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

export async function executeOpenAiPrompt(config: {
  prompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  instructions?: string;
  signal?: AbortSignal;
}) {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) throw new Error("Add your OpenAI API key in the AI Prompt inspector before running this node.");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: config.signal,
      body: JSON.stringify({
        model: config.model,
        input: config.prompt,
        instructions: config.instructions?.trim() || undefined,
        temperature: config.temperature,
        max_output_tokens: config.maxTokens,
      }),
    });
  } catch {
    throw new Error("The browser could not reach OpenAI. Check your connection and whether your browser allows this request.");
  }

  const body = (await response.json().catch(() => ({}))) as OpenAIResponse;
  if (!response.ok) throw new Error(body.error?.message || `OpenAI request failed (${response.status}).`);
  const text = getOutputText(body);
  if (!text) throw new Error("OpenAI returned no text output.");
  return { response: text, model: config.model };
}
