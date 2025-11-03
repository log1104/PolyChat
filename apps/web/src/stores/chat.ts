import { defineStore } from "pinia";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  mentor: string;
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
}

interface ChatHistoryRow {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
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

const defaultBaseUrl = import.meta.env.DEV
  ? "http://127.0.0.1:54321/functions/v1"
  : "";
const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl
).replace(/\/$/, "");
const chatEndpoint = apiBaseUrl ? `${apiBaseUrl}/chat` : "/chat";
const conversationsEndpoint = apiBaseUrl ? `${apiBaseUrl}/conversations` : "/conversations";
const healthEndpoint = apiBaseUrl ? `${apiBaseUrl}/chat/health` : "/health";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const SESSION_STORAGE_KEY = "polychat.sessionId";
const USER_STORAGE_KEY = "polychat.userId";

export const useChatStore = defineStore("chat", {
  state: (): ChatState => ({
    messages: [],
    // default mentor is general; auto-routing can switch this per message
    activeMentor: "general",
    isSending: false,
    sessionId: null,
    userId: null,
    error: null,
    conversations: [],
    conversationsLoading: false,
    apiOnline: null,
    lastHealthCheckAt: null,
  }),
  getters: {
    orderedMessages: (state) =>
      [...state.messages].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      ),
  },
  actions: {
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

      return "general";
    },
    async sendMessage(content: string) {
      if (!content.trim()) return;

      this.error = null;

      // Auto-route mentor based on content before sending (can be refined in Slice 2)
      const routedMentor = this.classifyMentor(content);
      this.activeMentor = routedMentor ?? this.activeMentor ?? "general";

      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: now,
        mentor: this.activeMentor,
      };

      this.messages.push(userMessage);
      this.isSending = true;

      try {
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
            mentorId: this.activeMentor,
            sessionId: this.sessionId ?? undefined,
            userId: this.userId ?? undefined,
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

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: data.mentorId,
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
            ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
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
        const response = await fetch(`${conversationsEndpoint}?${params.toString()}`, {
          headers: supabaseAnonKey
            ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
            : undefined,
        });
        if (!response.ok) throw new Error("Unable to load conversations");
        const data = (await response.json()) as ListConversationsResponse;
        this.conversations = data.conversations;
      } finally {
        this.conversationsLoading = false;
      }
    },
    async startNewConversation(mentorId?: string) {
      if (!this.userId) {
        // If we don't have a user yet, trigger a lightweight chat to create one implicitly
        // But to avoid sending a real message, we create a placeholder conversation via API when possible.
      }
      const response = await fetch(conversationsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(supabaseAnonKey
            ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
            : {}),
        },
        body: JSON.stringify({ userId: this.userId, mentorId: mentorId ?? this.activeMentor }),
      });
      if (!response.ok) throw new Error("Unable to start new conversation");
      const conv = (await response.json()) as ConversationSummary;
      // Set active session and mentor
      this.sessionId = conv.id;
      this.activeMentor = conv.mentorId;
      this.messages = [];
      // Update list and persist ids
      await this.loadConversations();
      this.persistSession();
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

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: data.mentorId,
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
      this.activeMentor = mentorId;
    },
    resetChat() {
      this.messages = [];
      this.sessionId = null;
      this.error = null;
      this.clearPersistedSession({ clearUser: false });
    },
    initializeFromStorage() {
      if (typeof window === "undefined") return;

      const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

      if (storedSession) {
        this.sessionId = storedSession;
      }
      if (storedUser) {
        this.userId = storedUser;
      }

      if (this.sessionId) {
        this.fetchExistingConversation(this.sessionId).catch(() => {
          // handled in fetchExistingConversation
        });
      }
      // Also load conversation list once userId is known (may be set by fetchExistingConversation)
      if (this.userId) {
        this.loadConversations().catch(() => {});
      }
      // Kick off an API health check on load
      this.checkHealth().catch(() => {});
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
      }
    },
  },
});
