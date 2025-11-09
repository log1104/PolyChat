import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/testing/asserts.ts";

import {
  enforceRateLimit,
  generateAssistantReply,
  RateLimitError,
} from "./index.ts";
import { DEFAULT_CHAT_MODEL } from "../../../shared/chatModel.ts";

const originalFetch = globalThis.fetch;

function withMockFetch<T>(
  fetchImpl: typeof globalThis.fetch,
  fn: () => Promise<T> | T,
): Promise<T> | T {
  globalThis.fetch = fetchImpl;
  return Promise.resolve(fn()).finally(() => {
    globalThis.fetch = originalFetch;
  });
}

Deno.test("generateAssistantReply returns trimmed assistant message", async () => {
  Deno.env.set("OPENROUTER_API_KEY", "test-key");
  await withMockFetch(
    async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "  Hello there!  " } }],
        }),
        { status: 200 },
      ),
    async () => {
      const reply = await generateAssistantReply(
        "general",
        "Hi",
        undefined,
        DEFAULT_CHAT_MODEL,
      );
      assertEquals(reply, "Hello there!");
    },
  );
});

Deno.test(
  "generateAssistantReply throws user-friendly error when provider fails",
  async () => {
    Deno.env.set("OPENROUTER_API_KEY", "test-key");
    await withMockFetch(
      async () =>
        new Response(
          JSON.stringify({ error: "model not found" }),
          { status: 500 },
        ),
      async () => {
        await assertRejects(
          () =>
            generateAssistantReply(
              "general",
              "Hi",
              undefined,
              DEFAULT_CHAT_MODEL,
            ),
          Error,
          "Mentor is unavailable right now. Please try again in a moment.",
        );
      },
    );
  },
);

Deno.test(
  "generateAssistantReply throws friendly timeout error when aborted",
  async () => {
    Deno.env.set("OPENROUTER_API_KEY", "test-key");
    await withMockFetch(
      () =>
        Promise.reject(
          new DOMException("Aborted", "AbortError"),
        ),
      async () => {
        await assertRejects(
          () =>
            generateAssistantReply(
              "general",
              "Hi",
              undefined,
              DEFAULT_CHAT_MODEL,
            ),
          Error,
          "Mentor is taking too long to respond. Please try again.",
        );
      },
    );
  },
);

Deno.test("enforceRateLimit allows traffic below threshold", async () => {
  const mockClient = {
    from() {
      return {
        select() {
          return Promise.resolve({ count: 5, error: null });
        },
      };
    },
  } as any;

  await enforceRateLimit(mockClient, "conversation-1");
});

Deno.test("enforceRateLimit throws RateLimitError when threshold exceeded", async () => {
  const mockClient = {
    from() {
      return {
        select() {
          return Promise.resolve({ count: 999, error: null });
        },
      };
    },
  } as any;

  await assertRejects(
    () => enforceRateLimit(mockClient, "conversation-1"),
    RateLimitError,
    "Too many messages sent in a short period. Please wait and try again.",
  );
});

Deno.test(
  "enforceRateLimit does not throw when Supabase returns an error",
  async () => {
    const mockClient = {
      from() {
        return {
          select() {
            return Promise.resolve({ count: null, error: new Error("boom") });
          },
        };
      },
    } as any;

    await enforceRateLimit(mockClient, "conversation-1");
  },
);
