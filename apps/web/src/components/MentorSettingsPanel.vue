<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useChatStore } from "../stores/chat";
import { getBaseMentorConfig } from "../lib/mentorConfigs";

const props = defineProps<{ mentorId: string }>();

// Collapsed state persisted so this panel doesn't crowd out recents
const COLLAPSE_KEY = "polychat.mentorSettings.collapsed";
const collapsed = ref(true);

const chatStore = useChatStore();

const mentors = computed(() => Object.values(chatStore.mentorConfigs));
const selectedMentorId = ref(props.mentorId);
const activeTab = ref<"persona" | "runtime" | "tools">("persona");

const activeMentorConfig = computed(() =>
  chatStore.mentorConfig(selectedMentorId.value),
);
const defaultPrompt = computed(
  () => getBaseMentorConfig(selectedMentorId.value).systemPrompt,
);

const promptDraft = ref(activeMentorConfig.value.systemPrompt ?? "");

onMounted(() => {
  // restore collapse state (default collapsed)
  try {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "false") collapsed.value = false;
  } catch {}
  chatStore.ensureMentorConfigsLoaded();
  if (!selectedMentorId.value) {
    selectedMentorId.value = mentors.value[0]?.id ?? props.mentorId;
  }
});

watch(
  () => props.mentorId,
  (value) => {
    if (value && value !== selectedMentorId.value) {
      selectedMentorId.value = value;
    }
  },
);

watch(
  () => selectedMentorId.value,
  () => {
    promptDraft.value = activeMentorConfig.value.systemPrompt ?? "";
  },
  { immediate: true },
);

const isDirty = computed(
  () =>
    promptDraft.value.trim() !==
    (activeMentorConfig.value.systemPrompt ?? "").trim(),
);

const hasOverride = computed(
  () =>
    (activeMentorConfig.value.systemPrompt ?? "").trim() !==
    defaultPrompt.value.trim(),
);

const formattedMentors = computed(() =>
  mentors.value.map((mentor) => ({
    id: mentor.id,
    label: mentor.id.replace(/(^|[-_])(\w)/g, (_, __, letter) =>
      letter.toUpperCase(),
    ),
  })),
);

function selectMentor(mentorId: string) {
  selectedMentorId.value = mentorId;
}

function setTab(tab: typeof activeTab.value) {
  activeTab.value = tab;
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  try {
    localStorage.setItem(COLLAPSE_KEY, String(collapsed.value));
  } catch {}
}

const overrideStatus = computed(() =>
  chatStore.mentorOverrideStatusFor(selectedMentorId.value),
);

const isSaving = computed(() => overrideStatus.value?.saving ?? false);

const statusMessage = computed(() => {
  const status = overrideStatus.value;
  if (status?.error) return status.error;
  if (isSaving.value) return "Saving...";
  if (isDirty.value) return "Unsaved changes";
  if (hasOverride.value) return "Custom prompt in use";
  if (status?.loaded) return "Using default prompt";
  return "Ready to edit";
});

const canSave = computed(() => isDirty.value && !isSaving.value);
const canReset = computed(() => hasOverride.value && !isSaving.value);

async function savePrompt() {
  if (!selectedMentorId.value || !canSave.value) return;
  try {
    await chatStore.saveMentorOverride(
      selectedMentorId.value,
      promptDraft.value,
    );
  } catch {
    // statusMessage will surface the error
  }
}

async function resetPrompt() {
  if (!selectedMentorId.value || !canReset.value) return;
  try {
    await chatStore.clearMentorOverride(selectedMentorId.value);
  } catch {
    // status message already reflects error
  }
}
</script>

<template>
  <section
    class="mt-4 rounded-xl border border-slate-300/70 bg-slate-50/70 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
  >
    <header class="sticky top-0 z-10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
      <h3
        class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        Mentor Settings
      </h3>
      <span v-if="hasOverride" class="text-[10px] text-amber-600">Customized</span>
      <button
        type="button"
        class="ml-2 rounded-md border border-slate-600/40 px-2 py-0.5 text-[11px] text-slate-200 hover:bg-slate-800/40"
        :aria-expanded="!collapsed"
        aria-controls="mentor-settings-content"
        @click="toggleCollapsed"
      >
        {{ collapsed ? 'Show' : 'Hide' }}
      </button>
    </header>

    <div v-if="!collapsed" id="mentor-settings-content">

    <ul class="mt-2 space-y-1.5">
      <li v-for="mentor in formattedMentors" :key="mentor.id">
        <button
          type="button"
          class="w-full rounded-lg border px-2 py-1 text-left text-[12px] font-medium transition"
          :class="
            mentor.id === selectedMentorId
              ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
          "
          @click="selectMentor(mentor.id)"
        >
          {{ mentor.label }}
        </button>
      </li>
    </ul>

    <div class="mt-3 flex gap-1.5">
      <button
        v-for="tab in ['persona','runtime','tools']"
        :key="tab"
        type="button"
        class="rounded-md px-2 py-1 text-[11px] font-medium"
        :class="tab === activeTab ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900' : 'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-800/10 dark:hover:bg-slate-200/10'"
        @click="setTab(tab as any)"
      >
        {{ (tab as string).charAt(0).toUpperCase() + (tab as string).slice(1) }}
      </button>
    </div>

    <!-- Persona tab placeholder -->
    <div v-if="activeTab === 'persona'" class="mt-3">
      <label class="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
        System Prompt
      </label>
      <textarea
        v-model="promptDraft"
        rows="5"
        class="w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
      ></textarea>
      <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[10px] text-slate-500 dark:text-slate-400">
          {{ statusMessage }}
        </span>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-md border border-slate-400/60 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:border-slate-400"
            :disabled="!canReset"
            @click="resetPrompt"
          >
            Reset
          </button>
          <button
            type="button"
            class="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            :disabled="!canSave"
            @click="savePrompt"
          >
            <span v-if="isSaving">Saving…</span>
            <span v-else>Save</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-else-if="activeTab === 'runtime'"
      class="mt-3 space-y-3 text-[12px] text-slate-500 dark:text-slate-400"
    >
      <div>
        <h4 class="text-[11px] font-semibold uppercase tracking-wide">
          Timeout
        </h4>
        <p class="text-xs">
          Placeholder: per-mentor response timeout before aborting the LLM call.
        </p>
      </div>
      <div>
        <h4 class="text-[11px] font-semibold uppercase tracking-wide">
          Max tokens
        </h4>
        <p class="text-xs">
          Placeholder: cap the tokens per reply to keep responses concise.
        </p>
      </div>
      <div>
        <h4 class="text-[11px] font-semibold uppercase tracking-wide">
          Retries
        </h4>
        <p class="text-xs">
          Placeholder: number of automatic retries and backoff strategy.
        </p>
      </div>
      <div>
        <h4 class="text-[11px] font-semibold uppercase tracking-wide">
          Rate limits
        </h4>
        <p class="text-xs">
          Placeholder: mentor-specific rate limit window and max requests.
        </p>
      </div>
      <div>
        <h4 class="text-[11px] font-semibold uppercase tracking-wide">
          Streaming
        </h4>
        <p class="text-xs">
          Placeholder: whether replies stream token-by-token or buffer.
        </p>
      </div>
    </div>
    <div v-else class="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
      <!-- TODO(Tools): Show which integrations are available and allow enabling/configuring them. -->
      Tools settings scaffold — to be implemented.
    </div>
    </div>
  </section>
</template>
