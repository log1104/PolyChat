import { defineStore } from "pinia";
import {
  getAllMentorConfigs,
  getBaseMentorConfig,
  hasMentor,
  type MentorConfig,
} from "../lib/mentorConfigs";
import { DEFAULT_CHAT_MODEL } from "../../../../shared/chatModel";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  mentor: string;
  files?: ChatFile[];
  model?: string;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  mentorId: string;
  title: string | null;
  createdAt: string;
  preview?: string;
  lastMessageAt?: string;
}

interface ChatState {
  messages: ChatMessage[];
  activeMentor: string;
  isSending: boolean;
  sessionId: string | null;
  userId: string | null;
  error: string | null;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;
  apiOnline: boolean | null; // null = unknown, true = reachable, false = unreachable
  lastHealthCheckAt: string | null;
  selectionMode: "auto" | "manual";
  lockedMentorId: string | null;
  selectedModel: string;
  mentorConfigs: Record<string, MentorConfig>;
  mentorOverrideStatus: Record<string, MentorOverrideStatus>;
  mentorOverridesLoadedForUserId: string | null;
}

interface ChatHistoryRow {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  mentor?: string;
  files?: ChatFile[];
  model?: string;
}

interface ChatApiResponse {
  conversationId: string;
  userId: string;
  mentorId: string;
  reply: string;
  history: ChatHistoryRow[];
}

interface ConversationResponse {
  conversationId: string;
  userId: string;
  mentorId: string;
  history: ChatHistoryRow[];
}

interface ListConversationsResponse {
  conversations: ConversationSummary[];
}

interface MentorConfigOverride {
  systemPrompt?: string;
}

type MentorOverrides = Record<string, MentorConfigOverride>;

interface MentorOverrideResponse {
  mentorId: string;
  systemPrompt: string | null;
}

interface MentorOverrideStatus {
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  error: string | null;
  lastSyncedAt: string | null;
}

const defaultBaseUrl = import.meta.env.DEV
  ? "http://127.0.0.1:54321/functions/v1"
  : "";
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl
).replace(/\/$/, "");
const chatEndpoint = apiBaseUrl ? `${apiBaseUrl}/chat` : "/chat";
const conversationsEndpoint = apiBaseUrl
  ? `${apiBaseUrl}/conversations`
  : "/conversations";
const healthEndpoint = apiBaseUrl ? `${apiBaseUrl}/chat/health` : "/health";
const mentorOverridesEndpoint = apiBaseUrl
  ? `${apiBaseUrl}/mentor-overrides`
  : "/mentor-overrides";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const SESSION_STORAGE_KEY = "polychat.sessionId";
const USER_STORAGE_KEY = "polychat.userId";
const MENTOR_OVERRIDES_STORAGE_KEY = "polychat.mentorOverrides";
const DEFAULT_MENTOR_ID = "general";

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    messages: [],
    // default mentor is general; auto-routing can switch this per message
  activeMentor: DEFAULT_MENTOR_ID,
    isSending: false,
    sessionId: null,
    userId: null,
    error: null,
    conversations: [],
    conversationsLoading: false,
    apiOnline: null,
    lastHealthCheckAt: null,
    selectionMode: "manual",
  lockedMentorId: DEFAULT_MENTOR_ID,
    selectedModel: DEFAULT_CHAT_MODEL,
    mentorConfigs: {},
    mentorOverrideStatus: {},
    mentorOverridesLoadedForUserId: null,
  }),
  getters: {
    orderedMessages: (state) =>
      [...state.messages].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      ),
    mentorConfig: (state) => (mentorId: string): MentorConfig => {
      const config = state.mentorConfigs[mentorId];
      if (config) return config;
      return getBaseMentorConfig(mentorId);
    },
    mentorOverrideStatusFor:
      (state) =>
      (mentorId: string): MentorOverrideStatus =>
        state.mentorOverrideStatus[mentorId] ?? {
          loading: false,
          saving: false,
          loaded: false,
          error: null,
          lastSyncedAt: null,
        },
  },
  actions: {
    ensureMentorConfigsLoaded() {
      if (Object.keys(this.mentorConfigs).length > 0) {
        return;
      }

      const baseConfigs = getAllMentorConfigs();
      const overrides = this.readMentorOverrides();

      this.mentorConfigs = baseConfigs.reduce<Record<string, MentorConfig>>(
        (acc, config) => {
          const override = overrides[config.id];
          acc[config.id] = {
            ...config,
            ...(override?.systemPrompt ? { systemPrompt: override.systemPrompt } : {}),
          };
          return acc;
        },
        {},
      );
    },
    readMentorOverrides(): MentorOverrides {
      if (typeof window === "undefined") {
        return {};
      }
      try {
        const raw = window.localStorage.getItem(MENTOR_OVERRIDES_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return parsed as MentorOverrides;
        }
      } catch (error) {
        console.warn("Failed to parse mentor overrides", error);
      }
      return {};
    },
    writeMentorOverrides(overrides: MentorOverrides) {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(
        MENTOR_OVERRIDES_STORAGE_KEY,
        JSON.stringify(overrides),
      );
    },
    updateMentorSystemPrompt(mentorId: string, systemPrompt: string) {
      this.ensureMentorConfigsLoaded();
      const trimmed = systemPrompt.trim();
      const current = this.mentorConfigs[mentorId] ?? getBaseMentorConfig(mentorId);
      this.mentorConfigs = {
        ...this.mentorConfigs,
        [mentorId]: { ...current, systemPrompt: trimmed },
      };

      const overrides = this.readMentorOverrides();
      overrides[mentorId] = { systemPrompt: trimmed };
      this.writeMentorOverrides(overrides);
    },
    resetMentorSystemPrompt(mentorId: string) {
      this.ensureMentorConfigsLoaded();
      const baseConfig = getBaseMentorConfig(mentorId);
      this.mentorConfigs = {
        ...this.mentorConfigs,
        [mentorId]: baseConfig,
      };

      const overrides = this.readMentorOverrides();
      if (overrides[mentorId]) {
        delete overrides[mentorId];
        this.writeMentorOverrides(overrides);
      }
    },
    setMentorOverrideStatus(
      mentorId: string,
      updates: Partial<MentorOverrideStatus>,
    ) {
      const current = this.mentorOverrideStatus[mentorId] ?? {
        loading: false,
        saving: false,
        loaded: false,
        error: null,
        lastSyncedAt: null,
      };
      this.mentorOverrideStatus = {
        ...this.mentorOverrideStatus,
        [mentorId]: { ...current, ...updates },
      };
    },
    async fetchMentorOverrideFromServer(mentorId: string) {
      if (!this.userId) return;
      this.setMentorOverrideStatus(mentorId, { loading: true, error: null });
      try {
        const params = new URLSearchParams({
          userId: this.userId,
          mentorId,
        });
        const response = await fetch(
          `${mentorOverridesEndpoint}?${params.toString()}`,
          {
            headers: supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : undefined,
          },
        );
        if (!response.ok) {
          const message = await extractErrorMessage(
            response,
            "Unable to load mentor settings",
          );
          throw new Error(message);
        }
        const data = (await response.json()) as MentorOverrideResponse;
        if (data.systemPrompt && data.systemPrompt.trim()) {
          this.updateMentorSystemPrompt(mentorId, data.systemPrompt);
        } else {
          this.resetMentorSystemPrompt(mentorId);
        }
        this.setMentorOverrideStatus(mentorId, {
          error: null,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to load mentor settings";
        this.setMentorOverrideStatus(mentorId, { error: message });
      } finally {
        this.setMentorOverrideStatus(mentorId, {
          loading: false,
          loaded: true,
          lastSyncedAt: new Date().toISOString(),
        });
      }
    },
    async ensureServerMentorOverridesLoaded() {
      if (!this.userId) return;
      if (this.mentorOverridesLoadedForUserId === this.userId) {
        return;
      }
      const mentorIds = getAllMentorConfigs().map((config) => config.id);
      await Promise.all(
        mentorIds.map((mentorId) =>
          this.fetchMentorOverrideFromServer(mentorId).catch(() => {}),
        ),
      );
      this.mentorOverridesLoadedForUserId = this.userId;
    },
    async saveMentorOverride(mentorId: string, systemPrompt: string) {
      this.ensureMentorConfigsLoaded();
      const trimmed = systemPrompt.trim();
      if (!trimmed) {
        await this.clearMentorOverride(mentorId);
        return;
      }

      this.setMentorOverrideStatus(mentorId, { saving: true, error: null });

      if (!this.userId) {
        this.updateMentorSystemPrompt(mentorId, trimmed);
        this.setMentorOverrideStatus(mentorId, {
          saving: false,
          loaded: true,
          lastSyncedAt: new Date().toISOString(),
        });
        return;
      }

      try {
        const response = await fetch(mentorOverridesEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            userId: this.userId,
            mentorId,
            systemPrompt: trimmed,
          }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(
            response,
            "Unable to save mentor settings",
          );
          throw new Error(message);
        }

        const data = (await response.json()) as MentorOverrideResponse;
        this.updateMentorSystemPrompt(
          data.mentorId,
          data.systemPrompt ?? trimmed,
        );
        this.setMentorOverrideStatus(mentorId, {
          saving: false,
          loaded: true,
          error: null,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to save mentor settings";
        this.setMentorOverrideStatus(mentorId, { saving: false, error: message });
        throw error;
      }
    },
    async clearMentorOverride(mentorId: string) {
      this.ensureMentorConfigsLoaded();
      this.setMentorOverrideStatus(mentorId, { saving: true, error: null });

      if (!this.userId) {
        this.resetMentorSystemPrompt(mentorId);
        this.setMentorOverrideStatus(mentorId, {
          saving: false,
          loaded: true,
          lastSyncedAt: new Date().toISOString(),
        });
        return;
      }

      try {
        const response = await fetch(mentorOverridesEndpoint, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            userId: this.userId,
            mentorId,
          }),
        });

        if (!response.ok) {
          const message = await extractErrorMessage(
            response,
            "Unable to reset mentor settings",
          );
          throw new Error(message);
        }

        this.resetMentorSystemPrompt(mentorId);
        this.setMentorOverrideStatus(mentorId, {
          saving: false,
          loaded: true,
          error: null,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to reset mentor settings";
        this.setMentorOverrideStatus(mentorId, { saving: false, error: message });
        throw error;
      }
    },
    /**
     * Lightweight, client-side mentor classifier.
     * Returns one of: 'bible' | 'chess' | 'stock' | 'general'.
     * Intentionally simple for Slice 1; replaced by Planner in Slice 2.
     */
    classifyMentor(text: string): string {
      const t = text.toLowerCase();

      // Bible: common book names, "verse", scripture references like John 3:16
      const bibleBooks =
        /(genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|psalms|proverbs|ecclesiastes|song of solomon|song of songs|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation)/i;
      const scriptureRef = /\b([1-3]?\s?[a-zA-Z]+)\s?\d{1,3}:\d{1,3}\b/;
      if (
        bibleBooks.test(t) ||
        /\b(verse|scripture|bible)\b/.test(t) ||
        scriptureRef.test(text)
      ) {
        return "bible";
      }

      // Chess: mentions chess/FEN/stockfish or algebraic-like tokens
      const fenLike =
        /\b([rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+\/[rnbqkp1-8]+)\b/i;
      if (
        /\b(chess|stockfish|best move|mate|checkmate|fen)\b/.test(t) ||
        fenLike.test(t)
      ) {
        return "chess";
      }

      // Stock: tickers, indicators
      if (
        /\b(rsi|macd|moving average|indicator|stocks?|price|earnings)\b/.test(
          t,
        ) ||
        /\b[A-Z]{2,5}\b/.test(text)
      ) {
        return "stock";
      }

  return DEFAULT_MENTOR_ID;
    },
    /**
     * Classify mentor based on uploaded files (mime or extension).
     * Simple heuristics: images -> chess, csv -> stock, docs/txt/pdf -> bible
     */
    classifyFromFiles(files: ChatFile[]): string | null {
      if (!files || !files.length) return null;
      for (const f of files) {
        const name = (f.name || "").toLowerCase();
        const type = f.type || "";

        if (type.startsWith("image/")) return "chess";
        if (name.endsWith(".csv") || type.includes("csv")) return "stock";
        if (
          name.endsWith(".txt") ||
          name.endsWith(".pdf") ||
          name.endsWith(".docx")
        )
          return "bible";
      }
      return null;
    },
    async sendMessage(content: string, files: ChatFile[] = []) {
      if (!content.trim()) return;

      this.error = null;

      // Auto-route mentor based on content or uploaded files before sending, unless in manual mode
      if (this.selectionMode === "auto") {
        let routedMentor = this.classifyMentor(content);
        const fileBased =
          files && files.length ? this.classifyFromFiles(files) : null;
        if (fileBased) routedMentor = fileBased;
        const safeMentor = hasMentor(routedMentor)
          ? routedMentor
          : DEFAULT_MENTOR_ID;
        this.activeMentor = safeMentor ?? this.activeMentor ?? DEFAULT_MENTOR_ID;
      } else {
        // Manual mode: use locked mentor
  this.activeMentor = this.lockedMentorId ?? DEFAULT_MENTOR_ID;
      }

      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: now,
        mentor: this.activeMentor,
        files,
      };

      this.messages.push(userMessage);
      this.isSending = true;

      try {
        this.ensureMentorConfigsLoaded();
        const mentorConfig =
          this.mentorConfigs[this.activeMentor] ??
          getBaseMentorConfig(this.activeMentor);
        const systemPrompt = mentorConfig.systemPrompt;

        const response = await fetch(chatEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : {}),
          },
          body: JSON.stringify({
            message: content,
            files,
            mentorId: this.activeMentor,
            sessionId: this.sessionId ?? undefined,
            userId: this.userId ?? undefined,
            model: this.selectedModel,
            systemPrompt,
          }),
        });

        if (!response.ok) {
          throw new Error("Unable to send message. Please try again.");
        }

        const data = (await response.json()) as ChatApiResponse;
        this.apiOnline = true;
        this.sessionId = data.conversationId;
        this.userId = data.userId;
        this.activeMentor = data.mentorId;
        this.lockedMentorId = data.mentorId;
        this.ensureServerMentorOverridesLoaded().catch(() => {});

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: item.mentor ?? data.mentorId,
          files: item.files,
          model: item.model,
        }));

        this.persistSession();
        // Refresh conversations so History reflects latest changes
        // Safe to fire-and-forget; errors are non-fatal
        this.loadConversations().catch(() => {});
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Unknown error";
        this.apiOnline = false; // likely network/API down
        this.messages = this.messages.filter(
          (message) => message.id !== userMessage.id,
        );
        throw error;
      } finally {
        this.isSending = false;
      }
    },
    async checkHealth() {
      try {
        const res = await fetch(healthEndpoint, {
          headers: supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : undefined,
        });
        this.apiOnline = res.ok;
      } catch {
        this.apiOnline = false;
      } finally {
        this.lastHealthCheckAt = new Date().toISOString();
      }
    },
    async loadConversations() {
      if (!this.userId) {
        // No user yet; nothing to load
        this.conversations = [];
        return;
      }
      this.conversationsLoading = true;
      try {
        const params = new URLSearchParams({ userId: this.userId });
        const response = await fetch(
          `${conversationsEndpoint}?${params.toString()}`,
          {
            headers: supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                }
              : undefined,
          },
        );
        if (!response.ok) throw new Error("Unable to load conversations");
        const data = (await response.json()) as ListConversationsResponse;
        this.conversations = data.conversations;
      } finally {
        this.conversationsLoading = false;
      }
    },
    async startNewConversation(mentorId?: string, options?: { bootstrap?: boolean }) {
      this.ensureMentorConfigsLoaded();
      const resolvedMentorId = mentorId ?? this.activeMentor ?? DEFAULT_MENTOR_ID;
      const safeMentorId = hasMentor(resolvedMentorId)
        ? resolvedMentorId
        : DEFAULT_MENTOR_ID;
      const mentorConfig =
        this.mentorConfigs[safeMentorId] ?? getBaseMentorConfig(safeMentorId);

      const response = await fetch(conversationsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : {}),
        },
        body: JSON.stringify({
          userId: this.userId ?? undefined,
          mentorId: safeMentorId,
          systemPrompt: mentorConfig.systemPrompt,
          bootstrap: options?.bootstrap ?? false,
        }),
      });
      if (!response.ok) throw new Error("Unable to start new conversation");
      const conv = (await response.json()) as ConversationSummary;
      // Set active session and mentor
      this.sessionId = conv.id;
      this.activeMentor = conv.mentorId;
      this.lockedMentorId = conv.mentorId;
      this.userId = conv.userId;
      this.ensureServerMentorOverridesLoaded().catch(() => {});
      this.messages = [];
      // Update list and persist ids
      await this.loadConversations();
      this.persistSession();
      if (options?.bootstrap && this.sessionId) {
        await this.fetchExistingConversation(this.sessionId).catch(() => {});
      }
    },
    async selectConversation(conversationId: string) {
      // Load messages for an existing conversation via existing method
      await this.fetchExistingConversation(conversationId);
    },
    async fetchExistingConversation(conversationId: string) {
      this.isSending = true;
      this.error = null;

      try {
        const params = new URLSearchParams({ conversationId });
        if (this.userId) {
          params.set("userId", this.userId);
        }

        const response = await fetch(`${chatEndpoint}?${params.toString()}`, {
          headers: supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : undefined,
        });

        if (!response.ok) {
          throw new Error(
            "Unable to load previous session. Starting a new chat.",
          );
        }

        const data = (await response.json()) as ConversationResponse;
        this.apiOnline = true;
        this.sessionId = data.conversationId;
        this.userId = data.userId;
        this.activeMentor = data.mentorId;
  this.lockedMentorId = data.mentorId;
        this.ensureServerMentorOverridesLoaded().catch(() => {});

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: item.mentor ?? data.mentorId,
          files: item.files,
          model: item.model,
        }));

        this.persistSession();
        // Keep conversation list in sync when switching
        this.loadConversations().catch(() => {});
      } catch (error) {
        this.error = error instanceof Error ? error.message : "Unknown error";
        this.apiOnline = false; // network/API issue
        this.clearPersistedSession();
      } finally {
        this.isSending = false;
      }
    },
    setMentor(mentorId: string) {
      this.ensureMentorConfigsLoaded();
      const safeMentorId = hasMentor(mentorId) ? mentorId : DEFAULT_MENTOR_ID;
      this.activeMentor = safeMentorId;
      this.selectionMode = "manual";
      this.lockedMentorId = safeMentorId;
    },
    setAuto() {
      this.selectionMode = "auto";
      this.lockedMentorId = null;
    },
    setSelectedModel(model: string) {
      this.selectedModel = model;
    },
    resetChat() {
      this.messages = [];
      this.sessionId = null;
      this.error = null;
  this.setMentor(DEFAULT_MENTOR_ID);
      this.clearPersistedSession({ clearUser: false });
    },
    initializeFromStorage() {
      if (typeof window === "undefined") return;

      this.ensureMentorConfigsLoaded();

      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

      if (storedSession) {
        this.sessionId = storedSession;
      }
      if (storedUser) {
        this.userId = storedUser;
      }

      if (!this.sessionId || !this.userId) {
        this.bootstrapInitialSession().catch(() => {});
      }

      if (this.sessionId) {
        this.fetchExistingConversation(this.sessionId).catch(() => {
          // handled in fetchExistingConversation
        });
      }
      // Also load conversation list once userId is known (may be set by fetchExistingConversation)
      if (this.userId) {
        this.loadConversations().catch(() => {});
        this.ensureServerMentorOverridesLoaded().catch(() => {});
      }
      // Kick off an API health check on load
      this.checkHealth().catch(() => {});
    },
    async bootstrapInitialSession() {
      if (this.sessionId || this.userId) return;
      try {
        await this.startNewConversation(undefined, { bootstrap: true });
      } catch (error) {
        console.warn("Failed to bootstrap initial conversation", error);
      }
    },
    persistSession() {
      if (typeof window === "undefined") return;
      if (this.sessionId) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, this.sessionId);
      }
      if (this.userId) {
        window.localStorage.setItem(USER_STORAGE_KEY, this.userId);
      }
    },
    clearPersistedSession(options?: { clearUser?: boolean }) {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      if (options?.clearUser !== false) {
        window.localStorage.removeItem(USER_STORAGE_KEY);
        this.mentorOverridesLoadedForUserId = null;
      }
    },
    async deleteConversation(conversationId: string) {
      if (!conversationId) return;
      const response = await fetch(conversationsEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
              }
            : {}),
        },
        body: JSON.stringify({
          userId: this.userId,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to delete conversation");
      }

      if (this.sessionId === conversationId) {
        this.resetChat();
      }

      await this.loadConversations();
      this.persistSession();
    },
  },
});

async function extractErrorMessage(response: Response, fallback: string) {
  let message = fallback;
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && "message" in payload) {
      const extracted = (payload as { message?: string }).message;
      if (typeof extracted === "string" && extracted.trim()) {
        message = extracted.trim();
      }
    }
  } catch {
    // Ignore parse failures and keep fallback.
  }
  return message;
}

