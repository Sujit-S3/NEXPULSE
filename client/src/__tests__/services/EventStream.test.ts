import { describe, expect, it } from "vitest";
import { readEventStream } from "../../features/core/services/api";

describe("readEventStream", () => {
  it("parses partial CRLF frames, ignores heartbeats, and preserves event order", async () => {
    const encoder = new TextEncoder();
    const chunks = [
      'event: ready\r\ndata: {"type":"thinking","content":"Ground',
      'ing"}\r\n\r\n: heartbeat\r\n\r\ndata: {"type":"chunk","content":"Hel',
      'lo"}\r\n\r\ndata: [DONE]\r\n\r\n',
    ];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
        controller.close();
      },
    });
    const events: { type: string; content: string }[] = [];

    await readEventStream(body, (event: { type: string; content: string }) => events.push(event));

    expect(events).toEqual([
      { type: "thinking", content: "Grounding" },
      { type: "chunk", content: "Hello" },
    ]);
  });
});
