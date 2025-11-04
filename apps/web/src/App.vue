<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ChatWindow from "./components/ChatWindow.vue";
import { useChatStore } from "./stores/chat";

const chatStore = useChatStore();

// Removed unused MentorBadge import and mentors array

const draft = ref("");

const messages = computed(() => chatStore.orderedMessages);
const activeMentor = computed(() => chatStore.activeMentor);
const isSending = computed(() => chatStore.isSending);
const error = computed(() => chatStore.error);

// Collapsible left sidebar (Gemini-style): collapsed = icon-only rail, expanded = wide with labels
const isSidebarExpanded = ref(false);

const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value;
};

// Mentor selection is handled within chat flow; sidebar no longer switches panels

const updateDraft = (value: string) => {
  draft.value = value;
};

const submitMessage = async (content: string, files: any[]) => {
  await chatStore.sendMessage(content, files);
  draft.value = "";
};

const resetChat = () => {
  chatStore.resetChat();
  draft.value = "";
};

onMounted(() => {
  chatStore.initializeFromStorage();
  // Load conversation list after initialization completes
  // If userId becomes available later, the store will load conversations itself
  // History list can be loaded lazily when we add the dedicated panel; not needed for sidebar toggle
  // Also proactively check API health on app mount
  chatStore.checkHealth().catch(() => {});
});
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-50">
    <!-- API health banner -->
    <div v-if="chatStore.apiOnline === false" class="w-full bg-red-600/20 text-red-200">
      <div class="mx-auto max-w-6xl px-4 py-2 text-sm">
        API is unreachable. Ensure Supabase is running. Retry in a moment.
        <span v-if="chatStore.lastHealthCheckAt" class="ml-2 text-xs text-red-300">
          Last check: {{ new Date(chatStore.lastHealthCheckAt).toLocaleTimeString() }}
        </span>
      </div>
    </div>

    <!-- Collapsible left sidebar (rail expands to reveal labels) -->
    <aside
      class="fixed inset-y-0 left-0 z-50 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60 transition-all duration-200"
      :class="isSidebarExpanded ? 'w-72' : 'w-12'"
      aria-label="Primary toolbar"
      :aria-expanded="isSidebarExpanded"
    >
      <div class="flex h-full flex-col py-4" :class="isSidebarExpanded ? 'items-start px-2' : 'items-center'">
        <button
          type="button"
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          :aria-pressed="isSidebarExpanded"
          class="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-50 shadow-sm transition hover:border-slate-500 hover:bg-slate-800"
          :class="{
            'border-slate-400 bg-slate-800 text-white': isSidebarExpanded,
          }"
          @click="toggleSidebar"
        >
          <span aria-hidden="true" class="text-xl leading-none">☰</span>
        </button>

        <nav class="flex flex-col gap-2" aria-label="Icon rail">
          <!-- Mentors -->
          <button
            type="button"
            class="group inline-flex items-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="isSidebarExpanded ? 'gap-2.5 px-2.5 py-1.5 w-full' : 'h-9 w-9 justify-center'"
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
            <span v-if="isSidebarExpanded" class="truncate text-sm text-slate-200">Mentors</span>
          </button>

          <!-- Settings -->
          <button
            type="button"
            class="group inline-flex items-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="isSidebarExpanded ? 'gap-2.5 px-2.5 py-1.5 w-full' : 'h-9 w-9 justify-center'"
            aria-label="Settings"
          >
            <!-- gear icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              class="h-4 w-4 flex-none"
            >
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 1-.14 1.41l2.17 1.68-2 3.46-2.54-.64a7.5 7.5 0 0 1-2.45 1.41l-.39 2.6h-4l-.39 2.6A7.5 7.5 0 0 1 9 19.32l-2.54.64-2-3.46 2.17-1.68A7.5 7.5 0 0 1 6 12c0-.49.05-.97.14-1.41L4 8.91l2-3.46L8.54 6a7.5 7.5 0 0 1 2.45-1.41l.39-2.6h4l.39 2.6A7.5 7.5 0 0 1 15 6l2.54-.64 2 3.46-2.17 1.68c.09.44.13.92.13 1.41Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="isSidebarExpanded" class="truncate text-sm text-slate-200">Settings</span>
          </button>

          <!-- Recent conversations list (visible when expanded) -->
          <div v-if="isSidebarExpanded" class="mt-4 w-full">
            <div class="px-1.5 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">Recent</div>
            <ul class="max-h-60 space-y-1 overflow-auto pr-1">
              <li v-if="chatStore.conversationsLoading" class="px-2 text-xs text-slate-500">Loading…</li>
              <li v-else-if="!chatStore.conversations.length" class="px-2 text-xs text-slate-500">No conversations yet</li>
              <li v-for="conv in chatStore.conversations" :key="conv.id">
                <button
                  type="button"
                  class="group flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[13px] text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  @click="chatStore.selectConversation(conv.id)"
                >
                  <span class="line-clamp-1">{{ conv.preview || conv.title || 'New chat' }}</span>
                  <span class="ml-2 shrink-0 text-[10px] text-slate-500">{{ new Date(conv.createdAt).toLocaleDateString() }}</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        <div class="flex-1"></div>

        <div class="mt-auto w-full px-0.5 text-[10px] text-slate-500" :class="isSidebarExpanded ? 'text-left' : 'text-center'">v0.1</div>
      </div>
    </aside>

    <!-- Main content: pad-left matches sidebar width with a slim gutter -->
    <div class="transition-all duration-200" :class="isSidebarExpanded ? 'pl-[20rem]' : 'pl-8'">
      <div class="mx-auto min-h-screen max-w-5xl px-4 py-6 lg:py-10">
  <section class="mx-auto w-full max-w-4xl">
          <ChatWindow
            :messages="messages"
            :active-mentor="activeMentor"
            :is-sending="isSending"
            :draft="draft"
            :error="error"
            @update:draft="updateDraft"
            @submit="submitMessage"
            @reset="resetChat"
          />
        </section>
      </div>
    </div>
  </main>
</template>
