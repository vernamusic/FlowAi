interface HttpHeader {
  id?: string;
  key: string;
  value: string;
}

interface HttpKeyValueItem extends HttpHeader {
  id?: string;
}

interface HttpRequestConfig {
  url?: string;
  method?: string;

  headers?: HttpHeader[];

  queryParams?: HttpKeyValueItem[] | Record<string, string>;

  body?: unknown;

  timeout?: number;

  authType?: "none" | "bearer" | "basic";
  token?: string;
  username?: string;
  password?: string;
}
interface HttpRequestOutput extends Record<string, unknown> {
  status: number;
  statusText: string;
  success: boolean;
  headers: Record<string, string>;
  data: unknown;
}

export async function executeHttpRequest(
  config: HttpRequestConfig,
): Promise<HttpRequestOutput> {
  if (!config.url) {
    throw new Error("HTTP request URL is required.");
  }

  const method = (config.method ?? "GET").toUpperCase();

  let url: URL;

  try {
    url = new URL(config.url);
  } catch {
    throw new Error("Enter a valid absolute URL, including http:// or https://.");
  }

  /**
   * Query params
   */
  const queryParams = Array.isArray(config.queryParams)
    ? config.queryParams
        .filter((item) => item.key.trim())
        .map((item) => [item.key, item.value] as const)
    : Object.entries(config.queryParams ?? {});

  for (const [key, value] of queryParams) {
    if (key.trim()) {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();

  const timeout = Math.min(Math.max(config.timeout ?? 10000, 1000), 120000);

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    /**
     * Headers
     */
    const headers: Record<string, string> = {};

    for (const header of config.headers ?? []) {
      if (!header.key.trim()) {
        continue;
      }

      headers[header.key] = header.value;
    }

    const hasAuthorization = Object.keys(headers).some(
      (key) => key.toLowerCase() === "authorization",
    );

    if (!hasAuthorization && config.authType === "bearer" && config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    if (!hasAuthorization && config.authType === "basic") {
      const credentials = `${config.username ?? ""}:${config.password ?? ""}`;
      headers.Authorization = `Basic ${btoa(credentials)}`;
    }

    /**
     * Body
     */
    let body: BodyInit | undefined;

    if (!["GET", "HEAD"].includes(method) && config.body != null) {
      const contentType = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === "content-type",
      )?.[1];

      /**
       * JSON
       */
      if (
        contentType?.includes("application/json") ||
        typeof config.body === "object"
      ) {
        body =
          typeof config.body === "string"
            ? config.body
            : JSON.stringify(config.body);

        if (!contentType) {
          headers["Content-Type"] = "application/json";
        }
      } else {
        /**
         * Raw string / form data
         */
        body = String(config.body);
      }
    }
    /**
     * Request
     */
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    /**
     * Response body
     */
    const responseText = await response.text();

    let data: unknown = responseText;

    const responseContentType = response.headers.get("content-type");

    if (responseContentType?.includes("application/json")) {
      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = responseText;
      }
    }

    /**
     * Response headers
     */
    const responseHeaders: Record<string, string> = {};

    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    /**
     * HTTP error
     */
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;

      if (typeof data === "object" && data !== null) {
        const errorData = data as Record<string, unknown>;

        if (typeof errorData.message === "string") {
          errorMessage += `: ${errorData.message}`;
        } else if (typeof errorData.error === "string") {
          errorMessage += `: ${errorData.error}`;
        }
      } else if (typeof data === "string" && data.trim()) {
        errorMessage += `: ${data}`;
      }

      throw new Error(errorMessage);
    }

    return {
      status: response.status,
      statusText: response.statusText,
      success: true,
      headers: responseHeaders,
      data,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`HTTP request timed out after ${timeout}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
