<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import ChatWindow from "./components/ChatWindow.vue";
import { useChatStore } from "./stores/chat";
import type { ChatFile } from "./stores/chat";

const chatStore = useChatStore();

// Removed unused MentorBadge import and mentors array

const draft = ref("");

const messages = computed(() => chatStore.orderedMessages);
const activeMentor = computed(() => chatStore.activeMentor);
const isSending = computed(() => chatStore.isSending);
const error = computed(() => chatStore.error);
const activeConversationId = computed(() => chatStore.sessionId);

const mentorOptions = [
  { id: "general", label: "General Mentor", description: "Default" },
  { id: "bible", label: "Bible Mentor", description: "Scripture" },
  { id: "chess", label: "Chess Mentor", description: "Strategy" },
  { id: "stock", label: "Stock Mentor", description: "Markets" },
  { id: "math", label: "Math Mentor", description: "Academics" },
] as const;

// Collapsible left sidebar (Gemini-style): collapsed = icon-only rail, expanded = wide with labels
const isSidebarExpanded = ref(false);
const isCreatingConversation = ref(false);
const deletingConversationId = ref<string | null>(null);

const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value;
};

const selectMentor = (mentorId: string) => {
  if (mentorId === activeMentor.value) return;
  chatStore.setMentor(mentorId);
};

const setAuto = () => {
  chatStore.setAuto();
};

const isSettingsOpen = ref(false);
const theme = ref<"light" | "dark" | "system">("system");
const systemPrefersDark = ref(false);
let systemMediaQuery: MediaQueryList | null = null;

if (typeof window !== "undefined") {
  systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemPrefersDark.value = systemMediaQuery.matches;
}

const openSettings = () => {
  isSettingsOpen.value = true;
};

const closeSettings = () => {
  isSettingsOpen.value = false;
};

const appliedTheme = computed(() =>
  theme.value === "system"
    ? systemPrefersDark.value
      ? "dark"
      : "light"
    : theme.value,
);

const applyTheme = () => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (appliedTheme.value === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

const setTheme = (newTheme: "light" | "dark" | "system") => {
  theme.value = newTheme;
};

const handleSystemChange = (event: MediaQueryListEvent) => {
  systemPrefersDark.value = event.matches;
};

const clearData = () => {
  if (
    confirm("Are you sure you want to clear all data? This cannot be undone.")
  ) {
    chatStore.clearPersistedSession({ clearUser: true });
    chatStore.resetChat();
    // Clear localStorage
    localStorage.clear();
    // Reload page
    window.location.reload();
  }
};

const updateDraft = (value: string) => {
  draft.value = value;
};

const submitMessage = async (content: string, files: ChatFile[]) => {
  await chatStore.sendMessage(content, files);
  draft.value = "";
};

const resetChat = () => {
  chatStore.resetChat();
  draft.value = "";
};

const startNewChat = async () => {
  if (!chatStore.messages.length) {
    return;
  }
  if (isCreatingConversation.value) return;
  isCreatingConversation.value = true;
  try {
    await chatStore.startNewConversation(chatStore.lockedMentorId ?? chatStore.activeMentor);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to start a new chat.";
    chatStore.error = message;
  } finally {
    isCreatingConversation.value = false;
  }
};

const requestDeleteConversation = async (conversationId: string) => {
  if (deletingConversationId.value) return;
  const confirmed =
    typeof window === "undefined"
      ? true
      : window.confirm("Delete this conversation? This cannot be undone.");

  if (!confirmed) {
    return;
  }

  deletingConversationId.value = conversationId;

  try {
    await chatStore.deleteConversation(conversationId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to delete conversation.";
    chatStore.error = message;
  } finally {
    deletingConversationId.value = null;
  }
};

onMounted(() => {
  chatStore.initializeFromStorage();
  // Load conversation list after initialization completes
  // If userId becomes available later, the store will load conversations itself
  // History list can be loaded lazily when we add the dedicated panel; not needed for sidebar toggle
  // Also proactively check API health on app mount
  chatStore.checkHealth().catch(() => {});

  if (typeof window === "undefined") return;

  const savedTheme = localStorage.getItem("polychat.theme") as
    | "light"
    | "dark"
    | "system"
    | null;
  if (
    savedTheme === "light" ||
    savedTheme === "dark" ||
    savedTheme === "system"
  ) {
    setTheme(savedTheme);
  }

  if (!systemMediaQuery) {
    systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    systemPrefersDark.value = systemMediaQuery.matches;
  }
  systemMediaQuery.addEventListener("change", handleSystemChange);
});

onBeforeUnmount(() => {
  if (systemMediaQuery) {
    systemMediaQuery.removeEventListener("change", handleSystemChange);
  }
});

watch(
  theme,
  (value) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("polychat.theme", value);
    }
    applyTheme();
  },
  { immediate: true },
);

watch(systemPrefersDark, () => {
  if (theme.value === "system") {
    applyTheme();
  }
});
</script>

<template>
  <main
    class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors"
  >
    <!-- API health banner -->
    <div
      v-if="chatStore.apiOnline === false"
      class="w-full bg-red-100 dark:bg-red-600/20 text-red-800 dark:text-red-200"
    >
      <div class="mx-auto max-w-6xl px-4 py-2 text-sm">
        API is unreachable. Ensure Supabase is running. Retry in a moment.
        <span
          v-if="chatStore.lastHealthCheckAt"
          class="ml-2 text-xs text-red-600 dark:text-red-300"
        >
          Last check:
          {{ new Date(chatStore.lastHealthCheckAt).toLocaleTimeString() }}
        </span>
      </div>
    </div>

    <aside
      class="fixed inset-y-0 left-0 z-50 bg-slate-100/80 backdrop-blur supports-[backdrop-filter]:bg-slate-100/60 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60 transition-all duration-200"
      :class="isSidebarExpanded ? 'w-72' : 'w-12'"
      aria-label="Primary toolbar"
      :aria-expanded="isSidebarExpanded"
    >
      <div
        class="flex h-full flex-col py-4"
        :class="isSidebarExpanded ? 'items-start px-2' : 'items-center'"
      >
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          :aria-pressed="isSidebarExpanded"
          class="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-300 bg-slate-50 text-slate-900 shadow-sm transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:hover:border-slate-500 dark:hover:bg-slate-800"
          :class="{
            'border-slate-400 bg-slate-100 text-slate-900 dark:border-slate-400 dark:bg-slate-800 dark:text-white':
              isSidebarExpanded,
          }"
          @click="toggleSidebar"
        >
          <span aria-hidden="true" class="text-xl leading-none">☰</span>
        </button>

        <button
          type="button"
          class="mb-3 inline-flex items-center rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          :class="[
            isSidebarExpanded
              ? 'w-full justify-start gap-2 px-3 py-2'
              : 'h-9 w-9 justify-center',
            isCreatingConversation
              ? 'cursor-wait border-slate-700 bg-slate-900/60 text-slate-400'
              : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:bg-slate-800',
          ]"
          :disabled="isCreatingConversation"
          :aria-busy="isCreatingConversation"
          :title="isSidebarExpanded ? undefined : 'New chat'"
          aria-label="Start a new chat"
          @click="startNewChat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            class="h-4 w-4 flex-none"
            aria-hidden="true"
          >
            <path
              d="M4 17.5V20h2.5L17.81 8.69l-2.5-2.5L4 17.5zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.5 2.5 1.83-1.83z"
              fill="currentColor"
            />
          </svg>
          <span v-if="isSidebarExpanded" class="text-sm font-medium">New chat</span>
        </button>

        <nav class="flex flex-col gap-2" aria-label="Icon rail">
          <!-- Mentors -->
          <button
            type="button"
            class="group inline-flex items-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="
              isSidebarExpanded
                ? 'gap-2.5 px-2.5 py-1.5 w-full'
                : 'h-9 w-9 justify-center'
            "
            aria-label="Mentors"
          >
            <!-- user-group icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              class="h-4 w-4 flex-none"
            >
              <path
                d="M16 14a4 4 0 1 1 4 4M4 18a4 4 0 1 1 8 0M12 9a4 4 0 1 1 8 0M2 10a4 4 0 1 0 8 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <span
              v-if="isSidebarExpanded"
              class="truncate text-sm text-slate-200"
              >Mentors</span
            >
          </button>
          <div v-if="isSidebarExpanded" class="w-full">
            <ul class="space-y-1">
              <li>
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-sm transition"
                  :class="
                    chatStore.selectionMode === 'auto'
                      ? 'border-slate-500 bg-slate-800/70 text-white'
                      : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60 hover:text-white'
                  "
                  :aria-pressed="chatStore.selectionMode === 'auto'"
                  @click="setAuto"
                >
                  <span class="font-medium">Auto</span>
                  <span class="text-xs text-slate-500">Smart routing</span>
                </button>
              </li>
              <li v-for="mentor in mentorOptions" :key="mentor.id">
                <button
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-sm transition"
                  :class="
                    mentor.id === activeMentor &&
                    chatStore.selectionMode === 'manual'
                      ? 'border-slate-500 bg-slate-800/70 text-white'
                      : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800/60 hover:text-white'
                  "
                  :aria-pressed="
                    mentor.id === activeMentor &&
                    chatStore.selectionMode === 'manual'
                  "
                  @click="selectMentor(mentor.id)"
                >
                  <span class="font-medium">{{ mentor.label }}</span>
                  <span class="text-xs text-slate-500">{{
                    mentor.description
                  }}</span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Recent conversations list (visible when expanded) -->
          <div v-if="isSidebarExpanded" class="mt-4 w-full">
            <div
              class="px-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400"
            >
              Recent
            </div>
            <ul class="max-h-60 space-y-1 overflow-auto pr-1">
              <li
                v-if="chatStore.conversationsLoading"
                class="px-2 text-xs text-slate-500"
              >
                Loading…
              </li>
              <li
                v-else-if="!chatStore.conversations.length"
                class="px-2 text-xs text-slate-500"
              >
                No conversations yet
              </li>
              <li v-for="conv in chatStore.conversations" :key="conv.id">
                <div class="group flex items-center gap-1.5">
                  <button
                    type="button"
                    class="flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1.5 text-left transition"
                    :class="
                      activeConversationId === conv.id
                        ? 'bg-slate-800/80 text-white'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    "
                    :aria-pressed="activeConversationId === conv.id"
                    @click="chatStore.selectConversation(conv.id)"
                  >
                    <span class="line-clamp-1 text-[13px] font-medium">{{
                      conv.preview || conv.title || 'New chat'
                    }}</span>
                    <span class="text-[10px] text-slate-500">{{
                      new Date(conv.createdAt).toLocaleDateString()
                    }}</span>
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-xs text-slate-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60"
                    :class="[
                      activeConversationId === conv.id
                        ? 'opacity-100 text-slate-200'
                        : 'opacity-0 group-hover:opacity-100',
                      deletingConversationId === conv.id
                        ? 'cursor-wait text-slate-400'
                        : 'hover:border-red-500 hover:text-red-400',
                    ]"
                    :disabled="deletingConversationId === conv.id"
                    :aria-busy="deletingConversationId === conv.id"
                    :title="deletingConversationId === conv.id ? 'Deleting conversation…' : 'Delete conversation'"
                    aria-label="Delete conversation"
                    @click.stop="requestDeleteConversation(conv.id)"
                  >
                    <svg
                      v-if="deletingConversationId !== conv.id"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      class="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7H6z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                    <span v-else class="text-[10px]">…</span>
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </nav>

        <div class="flex-1"></div>

        <div
          class="mt-auto flex w-full flex-col gap-2"
          :class="isSidebarExpanded ? 'items-start px-0.5' : 'items-center'"
        >
          <button
            type="button"
            class="inline-flex items-center rounded-lg border border-slate-300 text-slate-700 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
            :class="
              isSidebarExpanded
                ? 'h-9 w-fit gap-2 px-2 py-1 justify-start'
                : 'h-9 w-9 justify-center'
            "
            aria-label="Open settings"
            :title="isSidebarExpanded ? undefined : 'Settings'"
            :aria-expanded="isSettingsOpen"
            aria-controls="settings-drawer"
            @click="openSettings"
          >
            <!-- gear icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="h-4 w-4 flex-none"
            >
              <path
                d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"
              />
            </svg>
            <span
              v-if="isSidebarExpanded"
              class="truncate text-xs text-slate-200 text-left"
              >Settings and help</span
            >
          </button>
          <div
            class="text-[10px] text-slate-500 dark:text-slate-500"
            :class="isSidebarExpanded ? 'text-left' : 'text-center'"
          >
            v0.1
          </div>
        </div>
      </div>
    </aside>

    <!-- Settings drawer backdrop -->
    <div
      v-if="isSettingsOpen"
      class="fixed inset-0 z-65 bg-black/50 dark:bg-black/50"
      @click="closeSettings"
    ></div>

    <!-- Settings drawer -->
    <transition name="slide-left">
      <div
        v-if="isSettingsOpen"
        id="settings-drawer"
        class="fixed left-0 top-0 z-70 h-full w-80 bg-white border-r border-slate-200 dark:bg-slate-900 dark:border-slate-700 shadow-lg transition-colors"
      >
        <div class="flex h-full flex-col">
          <header
            class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700"
          >
            <h2 class="text-lg font-semibold text-slate-900 dark:text-white">
              Settings
            </h2>
            <button
              @click="closeSettings"
              class="text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white text-xl leading-none"
            >
              ✕
            </button>
          </header>
          <div class="flex-1 overflow-y-auto p-4 space-y-6">
            <!-- Theme Settings -->
            <section>
              <h3
                class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3"
              >
                Appearance
              </h3>
              <div class="space-y-2">
                <label class="flex items-center space-x-2">
                  <input
                    type="radio"
                    :value="'system'"
                    v-model="theme"
                    class="text-blue-600"
                  />
                  <span class="text-sm text-slate-900 dark:text-slate-200"
                    >Match system</span
                  >
                </label>
                <label class="flex items-center space-x-2">
                  <input
                    type="radio"
                    :value="'light'"
                    v-model="theme"
                    class="text-blue-600"
                  />
                  <span class="text-sm text-slate-900 dark:text-slate-200"
                    >Light</span
                  >
                </label>
                <label class="flex items-center space-x-2">
                  <input
                    type="radio"
                    :value="'dark'"
                    v-model="theme"
                    class="text-blue-600"
                  />
                  <span class="text-sm text-slate-900 dark:text-slate-200"
                    >Dark</span
                  >
                </label>
              </div>
            </section>
            <!-- Data Management -->
            <section>
              <h3
                class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3"
              >
                Data Management
              </h3>
              <button
                @click="clearData"
                class="w-full rounded border border-red-600 bg-red-50 dark:bg-red-900/20 p-2 text-sm text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition"
              >
                Clear All Data
              </button>
            </section>
            <!-- Help -->
            <section>
              <h3
                class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3"
              >
                Help
              </h3>
              <a
                href="https://github.com/log1104/PolyChat"
                target="_blank"
                class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                Documentation & GitHub
              </a>
            </section>
          </div>
        </div>
      </div>
    </transition>

    <!-- Main content: pad-left matches sidebar width with a slim gutter -->
    <div
      class="transition-all duration-200"
      :class="isSidebarExpanded ? 'pl-[20rem]' : 'pl-8'"
    >
      <div class="mx-auto min-h-screen max-w-5xl px-4 py-6 lg:py-10">
        <section class="mx-auto w-full max-w-4xl">
          <ChatWindow
            :messages="messages"
            :active-mentor="activeMentor"
            :is-sending="isSending"
            :draft="draft"
            :error="error"
            :selection-mode="chatStore.selectionMode"
            @update:draft="updateDraft"
            @submit="submitMessage"
            @reset="resetChat"
          />
        </section>
      </div>
    </div>
  </main>
</template>

<style>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(-100%);
}

.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
