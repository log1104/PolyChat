import { defineStore } from 'pinia';

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  mentor: string;
}

interface ChatState {
  messages: ChatMessage[];
  activeMentor: string;
  isSending: boolean;
  sessionId: string | null;
  userId: string | null;
  error: string | null;
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

const defaultBaseUrl =
  import.meta.env.DEV ? 'http://127.0.0.1:54321/functions/v1' : '';
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl).replace(/\/$/, '');
const chatEndpoint = apiBaseUrl ? `${apiBaseUrl}/chat` : '/chat';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
const SESSION_STORAGE_KEY = 'polychat.sessionId';
const USER_STORAGE_KEY = 'polychat.userId';

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    activeMentor: 'bible',
    isSending: false,
    sessionId: null,
    userId: null,
    error: null
  }),
  getters: {
    orderedMessages: (state) => [...state.messages].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  },
  actions: {
    async sendMessage(content: string) {
      if (!content.trim()) return;

      this.error = null;

      const now = new Date().toISOString();

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: now,
        mentor: this.activeMentor
      };

      this.messages.push(userMessage);
      this.isSending = true;

      try {
        const response = await fetch(chatEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(supabaseAnonKey
              ? {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`
                }
              : {})
          },
          body: JSON.stringify({
            message: content,
            mentorId: this.activeMentor,
            sessionId: this.sessionId ?? undefined,
            userId: this.userId ?? undefined
          })
        });

        if (!response.ok) {
          throw new Error('Unable to send message. Please try again.');
        }

        const data = (await response.json()) as ChatApiResponse;
        this.sessionId = data.conversationId;
        this.userId = data.userId;
        this.activeMentor = data.mentorId;

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: data.mentorId
        }));

        this.persistSession();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error';
        this.messages = this.messages.filter((message) => message.id !== userMessage.id);
        throw error;
      } finally {
        this.isSending = false;
      }
    },
    async fetchExistingConversation(conversationId: string) {
      this.isSending = true;
      this.error = null;

      try {
        const params = new URLSearchParams({ conversationId });
        if (this.userId) {
          params.set('userId', this.userId);
        }

        const response = await fetch(`${chatEndpoint}?${params.toString()}`, {
          headers: supabaseAnonKey
            ? {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`
              }
            : undefined
        });

        if (!response.ok) {
          throw new Error('Unable to load previous session. Starting a new chat.');
        }

        const data = (await response.json()) as ConversationResponse;
        this.sessionId = data.conversationId;
        this.userId = data.userId;
        this.activeMentor = data.mentorId;

        this.messages = data.history.map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          createdAt: item.createdAt,
          mentor: data.mentorId
        }));

        this.persistSession();
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Unknown error';
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
      this.userId = null;
      this.error = null;
      this.clearPersistedSession();
    },
    initializeFromStorage() {
      if (typeof window === 'undefined') return;

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
    },
    persistSession() {
      if (typeof window === 'undefined') return;
      if (this.sessionId) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, this.sessionId);
      }
      if (this.userId) {
        window.localStorage.setItem(USER_STORAGE_KEY, this.userId);
      }
    },
    clearPersistedSession() {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  }
});
