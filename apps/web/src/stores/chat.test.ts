import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useChatStore } from "./chat";

const originalFetch = globalThis.fetch;
const originalCrypto = globalThis.crypto;

describe("chat store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();

    const mockCrypto = {
      randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000000"),
    } as unknown as Crypto;
    vi.stubGlobal("crypto", mockCrypto);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    if (originalCrypto) {
      vi.stubGlobal("crypto", originalCrypto);
    }
  });

  it("sends a message successfully and replaces history", async () => {
    const history = [
      {
        id: "user-1",
        role: "user" as const,
        content: "hello",
        createdAt: new Date().toISOString(),
      },
      {
        id: "assistant-1",
        role: "assistant" as const,
        content: "Hi there!",
        createdAt: new Date().toISOString(),
      },
    ];

    const payload = {
      conversationId: "conv-1",
      userId: "user-42",
      mentorId: "general",
      reply: "Hi there!",
      history,
    };

    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const store = useChatStore();

    store.loadConversations = vi
      .fn()
      .mockResolvedValue(
        undefined,
      ) as unknown as typeof store.loadConversations;

    await store.sendMessage("hello", []);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(store.apiOnline).toBe(true);
    expect(store.error).toBeNull();
    expect(store.activeMentor).toBe("general");
    expect(store.sessionId).toBe("conv-1");
    expect(store.userId).toBe("user-42");
    expect(store.messages).toHaveLength(2);
    expect(store.messages[1].content).toBe("Hi there!");
  });

  it("surfaces rate limit error and clears optimistic message", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Too many messages" }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const store = useChatStore();

    await expect(store.sendMessage("hello", [])).rejects.toThrow(
      "Unable to send message. Please try again.",
    );

    expect(store.error).toBe("Unable to send message. Please try again.");
    expect(store.apiOnline).toBe(false);
    expect(store.messages).toHaveLength(0);
  });

  it("resetChat clears state and selection lock", () => {
    const store = useChatStore();
    store.messages = [
      {
        id: "abc",
        role: "user",
        content: "hi",
        createdAt: new Date().toISOString(),
        mentor: "general",
      },
    ];
    store.sessionId = "conv-1";
    store.error = "something went wrong";
    store.setMentor("bible");

    store.resetChat();

    expect(store.messages).toHaveLength(0);
    expect(store.sessionId).toBeNull();
    expect(store.selectionMode).toBe("auto");
    expect(store.lockedMentorId).toBeNull();
    expect(store.error).toBeNull();
  });
});
