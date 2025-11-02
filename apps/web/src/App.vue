<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import ChatWindow from "./components/ChatWindow.vue";
import MentorBadge from "./components/MentorBadge.vue";
import { useChatStore } from "./stores/chat";

const chatStore = useChatStore();

const mentors = reactive([
  {
    id: "general",
    name: "General Mentor",
    description: "All-purpose reasoning assistant",
  },
  {
    id: "bible",
    name: "Bible Mentor",
    description: "Scripture study and theology",
  },
  {
    id: "chess",
    name: "Chess Mentor",
    description: "Position analysis and strategy",
  },
  {
    id: "stock",
    name: "Stock Mentor",
    description: "Market indicators and insights",
  },
]);

const draft = ref("");

const messages = computed(() => chatStore.orderedMessages);
const activeMentor = computed(() => chatStore.activeMentor);
const isSending = computed(() => chatStore.isSending);
const error = computed(() => chatStore.error);

const isDrawerOpen = ref(false);
const activePanel = ref<"history" | "mentors" | "settings">("history");

const toggleMentorDrawer = () => {
  if (isDrawerOpen.value && activePanel.value === "mentors") {
    isDrawerOpen.value = false;
    return;
  }

  activePanel.value = "mentors";
  isDrawerOpen.value = true;
};

const handleMentorSelect = (mentorId: string) => {
  chatStore.setMentor(mentorId);
  isDrawerOpen.value = false; // close drawer after selection
};

const updateDraft = (value: string) => {
  draft.value = value;
};

const submitMessage = async (message: string) => {
  await chatStore.sendMessage(message);
  draft.value = "";
};

const resetChat = () => {
  chatStore.resetChat();
  draft.value = "";
};

onMounted(() => {
  chatStore.initializeFromStorage();
});
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-50">
    <!-- Fixed left icon rail -->
    <aside
      class="fixed inset-y-0 left-0 z-50 w-16 bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-slate-950/60"
      aria-label="Primary toolbar"
    >
      <div class="flex h-full flex-col items-center py-4">
        <button
          type="button"
          aria-label="Toggle menu"
          title="Toggle menu"
          :aria-pressed="isDrawerOpen && activePanel === 'mentors'"
          class="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-50 shadow-sm transition hover:border-slate-500 hover:bg-slate-800"
          :class="{
            'border-slate-400 bg-slate-800 text-white':
              isDrawerOpen && activePanel === 'mentors',
          }"
          @click="toggleMentorDrawer"
        >
          <span aria-hidden="true" class="text-2xl leading-none">☰</span>
        </button>

        <nav
          class="flex flex-1 flex-col items-center gap-3"
          aria-label="Icon rail"
        >
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="{
              'border-slate-700 bg-slate-900/70 text-white':
                activePanel === 'history' && isDrawerOpen,
            }"
            aria-label="Chat history"
            @click="
              activePanel = 'history';
              isDrawerOpen = true;
            "
          >
            <!-- history icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              class="h-5 w-5"
            >
              <path
                d="M4 12a8 8 0 1 0 4-6.928V3M4 4v5h5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="{
              'border-slate-700 bg-slate-900/70 text-white':
                activePanel === 'mentors' && isDrawerOpen,
            }"
            aria-label="Mentors"
            @click="
              activePanel = 'mentors';
              isDrawerOpen = true;
            "
          >
            <!-- user-group icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              class="h-5 w-5"
            >
              <path
                d="M16 14a4 4 0 1 1 4 4M4 18a4 4 0 1 1 8 0M12 9a4 4 0 1 1 8 0M2 10a4 4 0 1 0 8 0"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:text-white"
            :class="{
              'border-slate-700 bg-slate-900/70 text-white':
                activePanel === 'settings' && isDrawerOpen,
            }"
            aria-label="Settings"
            @click="
              activePanel = 'settings';
              isDrawerOpen = true;
            "
          >
            <!-- gear icon -->
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              class="h-5 w-5"
            >
              <path
                d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.5-3a7.5 7.5 0 0 1-.14 1.41l2.17 1.68-2 3.46-2.54-.64a7.5 7.5 0 0 1-2.45 1.41l-.39 2.6h-4l-.39-2.6A7.5 7.5 0 0 1 9 19.32l-2.54.64-2-3.46 2.17-1.68A7.5 7.5 0 0 1 6 12c0-.49.05-.97.14-1.41L4 8.91l2-3.46L8.54 6a7.5 7.5 0 0 1 2.45-1.41l.39-2.6h4l.39 2.6A7.5 7.5 0 0 1 15 6l2.54-.64 2 3.46-2.17 1.68c.09.44.13.92.13 1.41Z"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </nav>

        <div class="mt-auto text-[10px] text-slate-500">v0.1</div>
      </div>
    </aside>

    <!-- Main content with left gap equal to rail width + gutter -->
    <div class="pl-20">
      <div class="mx-auto min-h-screen max-w-6xl px-6 py-6 lg:py-10">
        <section>
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

    <!-- Drawer overlay (does not cover the icon rail) -->
    <div
      v-show="isDrawerOpen"
      class="fixed inset-y-0 left-16 right-0 z-40 bg-slate-950/60 backdrop-blur-[1px]"
      @click="isDrawerOpen = false"
    />

    <!-- Side drawer aligned to the right of the rail -->
    <aside
      v-if="isDrawerOpen"
      class="fixed inset-y-0 left-16 z-50 w-80 max-w-[90vw] border-r border-slate-800/80 bg-slate-900/80 shadow-card backdrop-blur"
      role="dialog"
      aria-label="Side panel"
    >
      <div class="relative flex h-full flex-col p-6">
        <div class="mb-4 flex items-center justify-between pr-12">
          <div>
            <h2 class="text-lg font-semibold text-slate-100">
              {{
                activePanel === "history"
                  ? "Chat history"
                  : activePanel === "mentors"
                    ? "Choose a mentor"
                    : "Settings"
              }}
            </h2>
            <p class="text-xs text-slate-400" v-if="activePanel === 'mentors'">
              Mentor affects styling and context hints.
            </p>
            <p class="text-xs text-slate-400" v-if="activePanel === 'history'">
              Recent conversations will appear here.
            </p>
            <p class="text-xs text-slate-400" v-if="activePanel === 'settings'">
              Customize your experience.
            </p>
          </div>
          <!-- Close button removed; overlay and rail toggle handle closing -->
        </div>

        <!-- Panel content -->
        <div class="min-h-0 flex-1 overflow-y-auto pr-1">
          <!-- History placeholder -->
          <div
            v-if="activePanel === 'history'"
            class="space-y-2 text-sm text-slate-400"
          >
            <p>No history yet. Your conversations will appear here.</p>
          </div>

          <!-- Mentors: reuse selector -->
          <ul v-if="activePanel === 'mentors'" class="space-y-3">
            <li v-for="mentor in mentors" :key="mentor.id">
              <button
                type="button"
                class="w-full rounded-2xl border border-slate-800/60 p-4 text-left transition hover:border-mentor hover:bg-slate-800/70"
                :class="{
                  'border-mentor bg-slate-800/70 text-white shadow-card':
                    mentor.id === activeMentor,
                }"
                @click="handleMentorSelect(mentor.id)"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">{{ mentor.name }}</span>
                  <MentorBadge
                    v-if="mentor.id === activeMentor"
                    :mentor-id="mentor.id"
                    :title="'Active'"
                  />
                </div>
                <p class="mt-1 text-xs text-slate-400">
                  {{ mentor.description }}
                </p>
              </button>
            </li>
          </ul>

          <!-- Settings placeholder -->
          <div
            v-if="activePanel === 'settings'"
            class="space-y-3 text-sm text-slate-300"
          >
            <div
              class="rounded-xl border border-slate-800/70 bg-slate-900/70 p-3"
            >
              <p class="text-xs text-slate-400">Settings coming soon.</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </main>
</template>
