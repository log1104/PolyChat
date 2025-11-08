<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useChatStore } from "../stores/chat";
import { getBaseMentorConfig } from "../lib/mentorConfigs";

const props = defineProps<{ mentorId: string }>();

const chatStore = useChatStore();

const mentors = computed(() => Object.values(chatStore.mentorConfigs));
const selectedMentorId = ref(props.mentorId);

const ensureSelection = () => {
  if (!selectedMentorId.value) {
    selectedMentorId.value = mentors.value[0]?.id ?? props.mentorId;
  }
};

const activeMentorConfig = computed(() =>
  chatStore.mentorConfig(selectedMentorId.value),
);
const defaultPrompt = computed(
  () => getBaseMentorConfig(selectedMentorId.value).systemPrompt,
);

const promptDraft = ref(activeMentorConfig.value.systemPrompt ?? "");

onMounted(() => {
  chatStore.ensureMentorConfigsLoaded();
  ensureSelection();
});

watch(
  () => chatStore.mentorConfigs,
  () => {
    ensureSelection();
  },
  { deep: true },
);

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
    const nextPrompt = activeMentorConfig.value.systemPrompt ?? "";
    promptDraft.value = nextPrompt;
  },
  { immediate: true },
);

watch(
  () => activeMentorConfig.value.systemPrompt,
  (value) => {
    if (typeof value === "string" && value !== promptDraft.value) {
      promptDraft.value = value;
    }
  },
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

function savePrompt() {
  chatStore.updateMentorSystemPrompt(selectedMentorId.value, promptDraft.value);
}

function resetPrompt() {
  chatStore.resetMentorSystemPrompt(selectedMentorId.value);
}
</script>

<template>
  <section class="mt-4 rounded-xl border border-slate-300/70 bg-slate-50/70 p-3 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
    <header class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Mentor Settings
        </h3>
        <button
          v-if="hasOverride"
          type="button"
          class="text-[10px] font-medium text-blue-600 transition hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
          @click="resetPrompt"
        >
          Reset
        </button>
      </div>

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="mentor in formattedMentors"
          :key="mentor.id"
          type="button"
          class="rounded-lg border px-2 py-1 text-[11px] font-medium transition"
          :class="
            mentor.id === selectedMentorId
              ? 'border-slate-800 bg-slate-900 text-white dark:border-slate-200 dark:bg-slate-100 dark:text-slate-900'
              : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
          "
          @click="selectMentor(mentor.id)"
        >
          {{ mentor.label }}
        </button>
      </div>
    </header>

    <div class="mt-3">
      <label class="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
        System Prompt
      </label>
      <textarea
        v-model="promptDraft"
        rows="5"
        class="w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-900 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-500"
      ></textarea>

      <div class="mt-2 flex items-center justify-between">
        <span class="text-[10px] text-slate-500 dark:text-slate-400">
          Used when chatting with this mentor
        </span>
        <button
          type="button"
          class="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          :disabled="!isDirty"
          @click="savePrompt"
        >
          Save
        </button>
      </div>
    </div>
  </section>
</template>
