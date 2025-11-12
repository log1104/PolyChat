<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import ChatWindow from "./components/ChatWindow.vue";
import { getBaseMentorConfig } from "./lib/mentorConfigs";
import { useChatStore } from "./stores/chat";
import { useAuthStore } from "./stores/auth";
import type { ChatFile } from "./stores/chat";

const chatStore = useChatStore();
const authStore = useAuthStore();

chatStore.ensureChatModelsLoaded();

// Removed unused MentorBadge import and mentors array

const draft = ref("");

const messages = computed(() => chatStore.orderedMessages);
const activeMentor = computed(() => chatStore.activeMentor);
const isSending = computed(() => chatStore.isSending);
const error = computed(() => chatStore.error);
const activeConversationId = computed(() => chatStore.sessionId);
const authLoading = computed(() => authStore.initializing);
const currentUser = computed(() => authStore.user);
const isAuthenticated = computed(() => authStore.isAuthenticated);
const currentUserLabel = computed(
  () =>
    currentUser.value?.email ??
    currentUser.value?.user_metadata?.full_name ??
    "Signed in user",
);

// Collapsible left sidebar (drawer)
const isSidebarExpanded = ref(true);
const toggleSidebar = () => {
  isSidebarExpanded.value = !isSidebarExpanded.value;
};
const isCreatingConversation = ref(false);
const deletingConversationId = ref<string | null>(null);

const isGeneralSettingsOpen = ref(false);
const isSettingsOpen = ref(false);
const mentorSettingsId = ref<string>("");

const theme = ref<"light" | "dark" | "system">("system");
const systemPrefersDark = ref(false);
let systemMediaQuery: MediaQueryList | null = null;

const themeOptions = [
  { id: "system" as const, label: "System" },
  { id: "light" as const, label: "Light" },
  { id: "dark" as const, label: "Dark" },
];

const modelCount = computed(() => chatStore.chatModels.length);
const modelOptions = computed(() => chatStore.chatModels);
const activeModelId = computed({
  get: () => chatStore.selectedModel,
  set: (value: string) => chatStore.setSelectedModel(value),
});
const isModelDialogOpen = ref(false);
const modelForm = reactive({ id: "", label: "" });
const modelFormError = ref<string | null>(null);
const modelsError = ref<string | null>(null);

const selectedModel = computed(() =>
  modelOptions.value.find((model) => model.id === activeModelId.value) ?? null,
);

const openModelDialog = () => {
  isModelDialogOpen.value = true;
  modelFormError.value = null;
};

const closeModelDialog = () => {
  isModelDialogOpen.value = false;
  modelForm.id = "";
  modelForm.label = "";
  modelFormError.value = null;
};

const submitModelForm = () => {
  const trimmedId = modelForm.id.trim();
  const trimmedLabel = modelForm.label.trim();
  if (!trimmedId || !trimmedLabel) {
    modelFormError.value = "Model ID and label are required.";
    return;
  }
  try {
    chatStore.addChatModel({ id: trimmedId, label: trimmedLabel });
    modelsError.value = null;
    closeModelDialog();
  } catch (error) {
    modelFormError.value =
      error instanceof Error ? error.message : "Unable to add model.";
  }
};

const removeModel = (modelId: string) => {
  const confirmed =
    typeof window === "undefined"
      ? true
      : window.confirm("Remove this model from your list?");
  if (!confirmed) return;
  try {
    chatStore.removeChatModel(modelId);
    modelsError.value = null;
  } catch (error) {
    modelsError.value =
      error instanceof Error ? error.message : "Unable to remove model.";
  }
};

if (typeof window !== "undefined") {
  systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemPrefersDark.value = systemMediaQuery.matches;
}

const mentorOptions = computed(() => {
  return Object.values(chatStore.mentorConfigs).map((mentor) => ({
    id: mentor.id,
    label: mentor.id.replace(/(^|[-_])(\w)/g, (_, __, letter) =>
      letter.toUpperCase(),
    ),
    prompt: mentor.systemPrompt ?? "",
  }));
});

const currentMentorOption = computed(() =>
  mentorOptions.value.find((mentor) => mentor.id === mentorSettingsId.value),
);

const mentorPersonaDraft = ref("");

const personaStatus = computed(() =>
  mentorSettingsId.value
    ? chatStore.mentorOverrideStatusFor(mentorSettingsId.value)
    : null,
);
const personaIsSaving = computed(() => personaStatus.value?.saving ?? false);
const personaStatusMessage = computed(() => {
  const status = personaStatus.value;
  if (status?.error) return status.error;
  if (personaIsSaving.value) return "Saving...";
  const activePrompt = currentMentorOption.value?.prompt?.trim() ?? "";
  if (mentorPersonaDraft.value.trim() !== activePrompt) {
    return "Unsaved changes";
  }
  if (
    activePrompt &&
    activePrompt !==
      (currentMentorOption.value
        ? getBaseMentorConfig(currentMentorOption.value.id).systemPrompt ?? ""
        : "")
  ) {
    return "Custom prompt in use";
  }
  return status?.loaded ? "Using default prompt" : "Ready to edit";
});
const personaCanSave = computed(() => {
  if (!mentorSettingsId.value || personaIsSaving.value) return false;
  const current = currentMentorOption.value?.prompt ?? "";
  return mentorPersonaDraft.value.trim() !== current.trim();
});
const personaCanReset = computed(() => {
  if (!mentorSettingsId.value || personaIsSaving.value) return false;
  const defaultPrompt = mentorSettingsId.value
    ? getBaseMentorConfig(mentorSettingsId.value).systemPrompt ?? ""
    : "";
  const currentPrompt = currentMentorOption.value?.prompt ?? "";
  return currentPrompt.trim() !== defaultPrompt.trim();
});

const savePersonaSetting = async () => {
  if (!mentorSettingsId.value || !personaCanSave.value) return;
  try {
    await chatStore.saveMentorOverride(
      mentorSettingsId.value,
      mentorPersonaDraft.value,
    );
  } catch {
    // status message already reflects error
  }
};

const resetPersonaSetting = async () => {
  if (!mentorSettingsId.value || !personaCanReset.value) return;
  try {
    await chatStore.clearMentorOverride(mentorSettingsId.value);
  } catch {
    // status message already reflects error
  }
};

const ensureMentorSelection = () => {
  if (!mentorSettingsId.value) {
    mentorSettingsId.value =
      chatStore.activeMentor ||
      mentorOptions.value[0]?.id ||
      "";
  }
  const active = mentorOptions.value.find(
    (mentor) => mentor.id === mentorSettingsId.value,
  );
  if (!active && mentorOptions.value.length > 0) {
    const firstMentor = mentorOptions.value[0];
    if (firstMentor) {
      mentorSettingsId.value = firstMentor.id;
    }
  }
};

const openSettings = () => {
  chatStore.ensureMentorConfigsLoaded();
  ensureMentorSelection();
  mentorPersonaDraft.value = currentMentorOption.value?.prompt ?? "";
  isSettingsOpen.value = true;
};

const closeSettings = () => {
  isSettingsOpen.value = false;
};

const openGeneralSettings = () => {
  isGeneralSettingsOpen.value = true;
};

const closeGeneralSettings = () => {
  isGeneralSettingsOpen.value = false;
  if (isModelDialogOpen.value) {
    closeModelDialog();
  }
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

const updateDraft = (value: string) => {
  draft.value = value;
};

const submitMessage = async (content: string, files: ChatFile[]) => {
  await chatStore.sendMessage(content, files);
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

const signInWithGoogle = async () => {
  try {
    await authStore.signInWithGoogle();
  } catch (error) {
    chatStore.error =
      error instanceof Error
        ? error.message
        : "Unable to sign in with Google.";
  }
};

const signOut = async () => {
  try {
    await authStore.signOut();
    chatStore.handleUserSignedOut();
  } catch (error) {
    chatStore.error =
      error instanceof Error ? error.message : "Unable to sign out.";
  }
};

onMounted(() => {
  authStore.initialize().catch(() => {});
  chatStore.ensureChatModelsLoaded();
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

watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) {
      chatStore
        .initializeForUser(userId)
        .catch(() => {
          chatStore.error = "Unable to load your conversations.";
        });
    } else {
      chatStore.handleUserSignedOut();
    }
  },
  { immediate: true },
);

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

watch(
  () => mentorSettingsId.value,
  (id) => {
    const active = mentorOptions.value.find((mentor) => mentor.id === id);
    if (active) {
      mentorPersonaDraft.value = active.prompt;
    }
  },
  { immediate: true },
);

watch(
  mentorOptions,
  () => {
    if (!mentorOptions.value.find((mentor) => mentor.id === mentorSettingsId.value)) {
      mentorSettingsId.value = "";
    }
    ensureMentorSelection();
    mentorPersonaDraft.value = currentMentorOption.value?.prompt ?? "";
  },
  { immediate: true },
);
</script>

<template>
  <main
    class="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50 transition-colors"
  >
    <div
      v-if="authLoading"
      class="flex min-h-screen items-center justify-center px-4 text-center text-sm text-slate-500 dark:text-slate-400"
    >
      Checking your session…
    </div>
    <div
      v-else-if="!isAuthenticated"
      class="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 px-4"
    >
      <div
        class="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-xl dark:border-slate-700 dark:bg-slate-900"
      >
        <p class="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Welcome to PolyChat
        </p>
        <h1 class="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          Sign in to continue
        </h1>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Use your Google account to keep conversations in sync.
        </p>
        <button
          type="button"
          class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          @click="signInWithGoogle"
        >
          <span aria-hidden="true">🔐</span>
          Continue with Google
        </button>
      </div>
    </div>
    <template v-else>
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
      class="fixed inset-y-0 left-0 z-50 overflow-y-auto bg-slate-100/80 backdrop-blur supports-[backdrop-filter]:bg-slate-100/60 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60 transition-all duration-200"
      :class="isSidebarExpanded ? 'w-72' : 'w-14'"
      aria-label="Primary navigation"
      :aria-expanded="isSidebarExpanded"
    >
      <div
        class="flex h-full flex-col gap-6 py-5"
        :class="isSidebarExpanded ? 'px-4' : 'items-center px-2'"
      >
        <header class="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            aria-label="Toggle navigation"
            :aria-pressed="isSidebarExpanded"
            @click="toggleSidebar"
          >
            <span aria-hidden="true" class="text-lg">☰</span>
          </button>
        </header>

        <div
          v-if="isSidebarExpanded"
          class="flex w-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300"
        >
          <span class="font-semibold text-slate-400 dark:text-slate-500">Signed in</span>
          <span class="truncate text-sm font-medium text-slate-900 dark:text-white">
            {{ currentUserLabel }}
          </span>
          <button
            type="button"
            class="self-start rounded-lg border border-slate-200 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
            @click="signOut"
          >
            Sign out
          </button>
        </div>

        <nav v-if="isSidebarExpanded" class="space-y-1" aria-label="Quick actions">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            :disabled="isCreatingConversation"
            :aria-busy="isCreatingConversation"
            @click="startNewChat"
          >
            <span aria-hidden="true" class="text-lg">＋</span>
            New chat
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            @click="openSettings"
            aria-label="Open mentor settings"
          >
            <span aria-hidden="true" class="text-lg">💡</span>
            <span>Mentor</span>
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
            disabled
            title="Search coming soon"
          >
            <span aria-hidden="true" class="text-lg">🔍</span>
            Search chats
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-500 dark:text-slate-400"
            disabled
            title="Library coming soon"
          >
            <span aria-hidden="true" class="text-lg">📚</span>
            Library
          </button>
        </nav>

        <section v-if="isSidebarExpanded" class="space-y-2 pb-6">
          <p class="sticky top-0 z-10 bg-slate-100/90 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-950/80 dark:text-slate-400">
            Recent
          </p>
          <ul class="space-y-1 pr-1">
            <li v-if="chatStore.conversationsLoading" class="px-2 text-xs text-slate-500">
              Loading…
            </li>
            <li v-else-if="!chatStore.conversations.length" class="px-2 text-xs text-slate-500">
              No conversations yet
            </li>
            <li v-for="conv in chatStore.conversations" :key="conv.id">
              <div class="group flex items-center gap-2">
                <button
                  type="button"
                  class="flex min-w-0 flex-1 flex-col rounded-xl px-3 py-2 text-left transition"
                  :class="
                    activeConversationId === conv.id
                      ? 'bg-slate-900/80 text-white'
                      : 'text-slate-300 hover:bg-slate-900/40 hover:text-white'
                  "
                  :aria-pressed="activeConversationId === conv.id"
                  @click="chatStore.selectConversation(conv.id)"
                >
                  <span class="line-clamp-1 text-[13px] font-medium">{{ conv.preview || conv.title || 'New chat' }}</span>
                  <span class="text-[10px] text-slate-400">{{ new Date(conv.createdAt).toLocaleDateString() }}</span>
                </button>
                <button
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs text-slate-500 transition hover:text-red-400"
                  :disabled="deletingConversationId === conv.id"
                  :aria-busy="deletingConversationId === conv.id"
                  :title="deletingConversationId === conv.id ? 'Deleting…' : 'Delete conversation'"
                  aria-label="Delete conversation"
                  @click.stop="requestDeleteConversation(conv.id)"
                >
                  <svg v-if="deletingConversationId !== conv.id" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M6 7h12m-9 0V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7H6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                  <span v-else class="text-[10px]">…</span>
                </button>
              </div>
            </li>
          </ul>
        </section>

        <div class="mt-auto flex w-full flex-col items-center gap-3">
          <button
            type="button"
            :class="[
              isSidebarExpanded
                ? 'flex w-full items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
                : 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 transition hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
            ]"
            aria-label="Open settings"
            @click="openGeneralSettings"
          >
            <span aria-hidden="true" class="text-lg">⚙</span>
            <span v-if="isSidebarExpanded">Settings</span>
          </button>
          <div
            v-if="isSidebarExpanded"
            class="text-[11px] text-slate-500 dark:text-slate-500"
          >
            v0.1
          </div>
        </div>
      </div>
    </aside>

    <transition name="settings-overlay">
      <div
        v-if="isSettingsOpen"
        class="fixed inset-0 z-70 flex items-center justify-center bg-black/60 px-4 py-8"
        @click.self="closeSettings"
      >
        <div
          class="flex w-[min(960px,95vw)] max-h-[90vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-white/10"
          role="dialog"
          aria-modal="true"
        >
          <aside class="flex w-64 flex-col border-r border-white/10">
            <div class="flex items-center justify-between px-4 py-3">
              <p class="text-sm font-semibold uppercase tracking-wide text-slate-300">
                Mentors
              </p>
              <button
                type="button"
                class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-lg"
                @click="closeSettings"
                aria-label="Close mentor settings"
              >
                ✕
              </button>
            </div>
            <nav class="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
              <button
                v-for="mentor in mentorOptions"
                :key="mentor.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition"
                :class="
                  mentorSettingsId === mentor.id
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5'
                "
                @click="mentorSettingsId = mentor.id"
              >
                <span aria-hidden="true" class="text-lg">💡</span>
                <div class="flex-1">
                  <p class="text-sm font-semibold">{{ mentor.label }}</p>
                  <p class="text-xs">Persona, runtime, tools</p>
                </div>
              </button>
            </nav>
          </aside>
          <section class="flex-1 overflow-y-auto p-8 space-y-6">
            <div v-if="currentMentorOption" class="space-y-5">
              <div>
                <h2 class="text-2xl font-semibold text-white">
                  {{ currentMentorOption.label }}
                </h2>
                <p class="text-sm text-slate-400">
                  Persona and upcoming runtime/tools configuration.
                </p>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 class="text-sm font-semibold text-white">Persona (System Prompt)</h3>
                <textarea
                  v-model="mentorPersonaDraft"
                  class="mt-3 h-48 w-full resize-none rounded-2xl border border-white/20 bg-slate-900/60 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                ></textarea>
                <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span>{{ personaStatusMessage }}</span>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="rounded-full border border-white/30 px-4 py-1 text-[11px] font-semibold text-white transition hover:border-white/50 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!personaCanReset"
                      @click="resetPersonaSetting"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      class="rounded-full bg-white px-4 py-1 text-[11px] font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      :disabled="!personaCanSave"
                      @click="savePersonaSetting"
                    >
                      <span v-if="personaIsSaving">Saving…</span>
                      <span v-else>Save</span>
                    </button>
                  </div>
                </div>
              </div>
              <div class="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100">
                <div class="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Runtime Controls</span>
                  <span>Coming soon</span>
                </div>
                <div class="space-y-4 text-sm text-slate-300">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-slate-200">Timeout (seconds)</label>
                    <input
                      type="number"
                      disabled
                      placeholder="15"
                      class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200"
                    />
                    <p class="text-[11px] text-slate-500">
                      Auto-cancel mentor responses once this timer expires.
                    </p>
                  </div>
                  <div class="grid gap-4 md:grid-cols-2">
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-medium text-slate-200">Max tokens</label>
                      <input
                        type="number"
                        disabled
                        placeholder="400"
                        class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200"
                      />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-xs font-medium text-slate-200">Retries</label>
                      <input
                        type="number"
                        disabled
                        placeholder="1"
                        class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200"
                      />
                    </div>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-slate-200">Rate limit</label>
                    <input
                      type="text"
                      disabled
                      placeholder="10 requests / 5 min"
                      class="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div class="flex items-center justify-between rounded-2xl border border-dashed border-white/15 px-3 py-2 text-xs">
                    <div class="text-slate-400">
                      <p class="font-semibold">Streaming replies</p>
                      <p class="text-[11px] text-slate-500">
                        Toggle live token streaming per mentor.
                      </p>
                    </div>
                    <span class="text-slate-500">Disabled</span>
                  </div>
                </div>
              </div>
              <div class="rounded-2xl border border-dashed border-white/15 bg-white/5 p-5 text-sm text-slate-400">
                Tools & integrations editor will land here once configurable.
              </div>
            </div>
            <div v-else class="space-y-4 text-sm text-slate-300">
              <p>Select a mentor from the list to view settings.</p>
            </div>
          </section>
        </div>
      </div>
    </transition>

    <transition name="settings-overlay">
      <div
        v-if="isGeneralSettingsOpen"
        class="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4 py-8"
        @click.self="closeGeneralSettings"
      >
        <div
          class="w-[min(720px,95vw)] max-h-[90vh] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-white/10"
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 class="text-xl font-semibold text-white">Settings</h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg"
              aria-label="Close settings"
              @click="closeGeneralSettings"
            >
              ✕
            </button>
          </div>
          <div class="space-y-5 overflow-y-auto p-6">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex flex-col items-center gap-3">
                <span class="text-sm font-semibold text-white">Theme</span>
                <div class="flex w-full flex-wrap items-center justify-evenly gap-2">
                  <button
                    v-for="option in themeOptions"
                    :key="option.id"
                    type="button"
                    class="rounded-full border border-white/20 px-4 py-1 text-sm font-semibold text-slate-200 transition"
                    :class="
                      theme === option.id
                        ? 'bg-white/20 text-white'
                        : 'hover:border-white/40 hover:text-white'
                    "
                    @click="setTheme(option.id)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-white">LLM Models</span>
                    <span class="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-slate-300">
                      {{ modelCount }}
                    </span>
                  </div>
                  <button
                    type="button"
                    class="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/40 hover:text-white"
                    @click="isModelDialogOpen ? closeModelDialog() : openModelDialog()"
                  >
                    {{ isModelDialogOpen ? "Close" : "Add" }}
                  </button>
                </div>
                <p class="text-xs text-slate-400">
                  Choose your active model and curate the list shown in chat.
                </p>
                <label class="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Active model
                  <select
                    v-model="activeModelId"
                    class="mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100 transition focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <option v-for="option in modelOptions" :key="option.id" :value="option.id">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
                <p
                  v-if="modelsError"
                  class="rounded-xl border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
                  role="alert"
                >
                  {{ modelsError }}
                </p>
                <div
                  v-if="selectedModel && !isModelDialogOpen"
                  class="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div class="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-white">{{ selectedModel.label }}</p>
                      <p class="text-[11px] text-slate-400">{{ selectedModel.id }}</p>
                    </div>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:text-rose-200"
                      @click="removeModel(selectedModel.id)"
                    >
                      Remove
                    </button>
                  </div>
                  <p class="mt-3 text-xs text-slate-400">
                    This is the model currently active in chat. Removing it will fall back to the next available option.
                  </p>
                </div>
                <p
                  v-else-if="!isModelDialogOpen"
                  class="rounded-xl border border-dashed border-white/15 bg-white/5 px-3 py-2 text-center text-xs text-slate-400"
                >
                  No models yet. Add one to get started.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="model-dialog">
      <div
        v-if="isModelDialogOpen"
        class="fixed inset-0 z-70 flex items-center justify-center bg-black/70 px-4 py-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="model-dialog-title"
        @click.self="closeModelDialog"
      >
        <div
          class="w-[min(480px,95vw)] rounded-3xl bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-white/15"
          tabindex="-1"
          @keydown.escape="closeModelDialog"
        >
          <div class="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <h3 id="model-dialog-title" class="text-lg font-semibold text-white">Add LLM Model</h3>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-lg"
              aria-label="Close add model dialog"
              @click="closeModelDialog"
            >
              ✕
            </button>
          </div>
          <form class="space-y-4 px-6 py-5 text-sm text-slate-200" @submit.prevent="submitModelForm">
            <p class="text-xs text-slate-400">
              Provide the model identifier and a readable label so it appears in the chat model switcher.
            </p>
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Model ID
              <input
                v-model="modelForm.id"
                type="text"
                placeholder="provider/model-name"
                class="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/25"
              />
            </label>
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-400">
              Display name
              <input
                v-model="modelForm.label"
                type="text"
                placeholder="Readable label"
                class="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-white/35 focus:outline-none focus:ring-2 focus:ring-white/25"
              />
            </label>
            <p
              v-if="modelFormError"
              class="rounded-xl border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
              role="alert"
            >
              {{ modelFormError }}
            </p>
            <div class="flex justify-end gap-2 text-xs">
              <button
                type="button"
                class="rounded-full border border-white/15 px-3 py-1 text-slate-200 transition hover:border-white/30 hover:text-white"
                @click="closeModelDialog"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="rounded-full border border-white/15 px-3 py-1 font-semibold text-slate-900 transition"
                :class="modelForm.id && modelForm.label ? 'bg-white hover:bg-white/90' : 'bg-white/40 text-slate-500'"
                :disabled="!modelForm.id || !modelForm.label"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Main content: pad-left matches sidebar width with a slim gutter -->
    <div
      class="transition-all duration-200"
      :class="isSidebarExpanded ? 'pl-[20rem]' : 'pl-20'"
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
          />
        </section>
      </div>
    </div>
    </template>
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

.settings-overlay-enter-active,
.settings-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.settings-overlay-enter-from,
.settings-overlay-leave-to {
  opacity: 0;
}

.model-dialog-enter-active,
.model-dialog-leave-active {
  transition: opacity 0.2s ease;
}

.model-dialog-enter-from,
.model-dialog-leave-to {
  opacity: 0;
}
</style>
