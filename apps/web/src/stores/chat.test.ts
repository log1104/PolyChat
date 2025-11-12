import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useChatStore } from "./chat";
import { DEFAULT_CHAT_MODEL } from "../../../../shared/chatModel";

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
    store.userId = "user-42";
    store.chatModels = [
      { id: DEFAULT_CHAT_MODEL, label: "Default", position: 0 },
    ];
    store.selectedModel = DEFAULT_CHAT_MODEL;

    store.loadConversations = vi
      .fn()
      .mockResolvedValue(
        undefined,
      ) as unknown as typeof store.loadConversations;

    await store.sendMessage("hello", []);

    expect(globalThis.fetch).toHaveBeenCalled();
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
  store.userId = "user-42";

    await expect(store.sendMessage("hello", [])).rejects.toThrow();

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
  expect(store.selectionMode).toBe("manual");
  expect(store.lockedMentorId).toBe("general");
    expect(store.error).toBeNull();
  });

  it("syncChatModelsWithServer hydrates remote models", async () => {
    const responsePayload = {
      models: [{ id: "provider/model", label: "Provider", position: 0 }],
    };

    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const store = useChatStore();
    store.userId = "user-1";

    await store.syncChatModelsWithServer({ force: true });

    expect(store.chatModels).toEqual([
      { id: "provider/model", label: "Provider", position: 0 },
    ]);
    expect(store.chatModelsSyncedForUserId).toBe("user-1");
    expect(store.chatModelsError).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("addChatModel rolls back when API call fails", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const store = useChatStore();
    store.userId = "user-77";
    store.chatModels = [
      { id: "existing/model", label: "Existing", position: 0 },
    ];
    store.selectedModel = "existing/model";

    await expect(
      store.addChatModel({ id: "new/model", label: "New Model" }),
    ).rejects.toThrow("boom");

    expect(store.chatModels).toEqual([
      { id: "existing/model", label: "Existing", position: 0 },
    ]);
    expect(store.selectedModel).toBe("existing/model");
    expect(store.chatModelsSaving).toBe(false);
  });
});
