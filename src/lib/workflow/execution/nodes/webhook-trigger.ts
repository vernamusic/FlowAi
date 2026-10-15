export type WebhookMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface WebhookTriggerConfig {
  /** Path shown in the simulated request, may include a query string. */
  path: string;

  method: WebhookMethod;

  /** Raw JSON body the caller would have sent. */
  payload: string;
}

const methods: WebhookMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function readWebhookTriggerConfig(
  raw: Record<string, unknown> | undefined,
): WebhookTriggerConfig {
  const config = raw ?? {};

  return {
    path:
      typeof config.path === "string" && config.path.trim()
        ? config.path.trim()
        : "/webhook",
    method: methods.includes(config.method as WebhookMethod)
      ? (config.method as WebhookMethod)
      : "POST",
    payload: typeof config.payload === "string" ? config.payload : "",
  };
}

/**
 * Turn the configured payload into the shape a webhook would produce.
 *
 * A workflow runs entirely in the browser, so this node stands in for an
 * inbound request: the body is parsed here so downstream nodes can read
 * it exactly like real webhook data.
 */
export function executeWebhookTrigger(
  config: WebhookTriggerConfig,
): Record<string, unknown> {
  const { pathname, query } = splitPath(config.path);
  const body = parsePayload(config.payload);

  return {
    method: config.method,
    path: pathname,
    url: `https://simulated.local${pathname}`,
    query,
    headers: {
      "content-type": "application/json",
      "user-agent": "FlowAI/1.0 (simulated)",
      "x-flowai-trigger": "webhook",
    },
    body,
    receivedAt: new Date().toISOString(),
  };
}

function parsePayload(payload: string): unknown {
  const trimmed = payload.trim();

  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    throw new Error(
      `The webhook payload is not valid JSON${
        error instanceof Error ? `: ${error.message}` : "."
      }`,
    );
  }
}

function splitPath(path: string): { pathname: string; query: Record<string, string> } {
  const [rawPath = "", rawSearch = ""] = path.split("?", 2);
  const pathname = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const query: Record<string, string> = {};

  new URLSearchParams(rawSearch).forEach((value, key) => {
    query[key] = value;
  });

  return { pathname, query };
}