interface HttpHeader {
  id?: string;
  key: string;
  value: string;
}

interface HttpRequestConfig {
  url?: string;
  method?: string;

  headers?: HttpHeader[];

  queryParams?: Record<string, string>;

  body?: unknown;

  timeout?: number;
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

  const url = new URL(config.url);

  /**
   * Query params
   */
  if (config.queryParams) {
    for (const [key, value] of Object.entries(config.queryParams)) {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();

  const timeout = config.timeout ?? 10000;

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
    console.log("========== HTTP REQUEST ==========");
    console.log("URL:", url.toString());
    console.log("METHOD:", method);
    console.log("HEADERS:", headers);
    console.log("BODY:", body);
    console.log("BODY TYPE:", typeof body);
    console.log("==================================");
    /**
     * Request
     */
    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    console.log("========== HTTP RESPONSE ==========");
    console.log("STATUS:", response.status);
    console.log("STATUS TEXT:", response.statusText);
    console.log("CONTENT-TYPE:", response.headers.get("content-type"));
    console.log("ACCEPT-POST:", response.headers.get("accept-post"));
    console.log("==================================");
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
