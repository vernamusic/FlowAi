export interface SseMessage {
  event?: string;

  /** Raw payload of the `data:` field. */
  data: string;
}

const eventBoundary = /\r?\n\r?\n/g;

/**
 * Read a Server-Sent Events response body and yield one message per
 * dispatched event.
 *
 * Works with any OpenAI-compatible streaming endpoint, because they all
 * follow the `event:`/`data:` line format.
 */
export async function* readSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseMessage> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let boundary = eventBoundary.exec(buffer);

      while (boundary) {
        const rawEvent = buffer.slice(0, boundary.index);

        buffer = buffer.slice(boundary.index + boundary[0].length);

        const message = parseSseMessage(rawEvent);

        if (message) {
          yield message;
        }

        boundary = eventBoundary.exec(buffer);
      }
    }

    /**
     * Some providers do not terminate the last event with a blank line.
     */
    const trailing = parseSseMessage(buffer);

    if (trailing) {
      yield trailing;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseMessage(rawEvent: string): SseMessage | null {
  const dataLines: string[] = [];
  let eventName: string | undefined;

  for (const line of rawEvent.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");

    const field = separatorIndex === -1 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex === -1 ? "" : line.slice(separatorIndex + 1);

    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    if (field === "data") {
      dataLines.push(value);
    } else if (field === "event") {
      eventName = value;
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return { event: eventName, data: dataLines.join("\n") };
}