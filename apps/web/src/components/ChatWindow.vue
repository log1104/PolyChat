<template>
  <section
    class="flex h-full flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-card"
  >
    <header class="flex flex-wrap items-center justify-between gap-4">
      <label class="flex items-center gap-2 text-xs text-slate-300">
        <span aria-hidden="true" class="text-sm">🧠</span>
        <span class="sr-only">LLM model</span>
        <select
          v-model="selectedModel"
          class="w-44 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-100 focus:border-mentor focus:outline-none"
        >
          <option
            v-for="option in modelOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <div class="inline-flex items-center gap-2 text-xs text-slate-400">
        <span class="inline-flex items-center gap-1">
          <span
            class="h-2 w-2 rounded-full border border-slate-300 bg-emerald-400"
          ></span>
          {{ isSending ? "Thinking..." : "Ready" }}
        </span>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden">
      <MessageList
        :messages="messages"
        :active-mentor="activeMentor"
        class="h-full"
      />
    </div>

    <p
      v-if="error"
      class="rounded-lg border border-rose-600/40 bg-rose-900/40 px-3 py-2 text-xs text-rose-100"
    >
      {{ error }}
    </p>

    <MessageInput
      v-model="draft"
      :disabled="isSending"
      :mentor-id="activeMentor"
      @submit="(content, files) => $emit('submit', content, files)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ChatMessage, ChatFile } from "../stores/chat";
import { useChatStore } from "../stores/chat";
import MessageList from "./MessageList.vue";
import MessageInput from "./MessageInput.vue";

const props = defineProps<{
  messages: ChatMessage[];
  activeMentor: string;
  isSending: boolean;
  draft: string;
  error?: string | null;
  selectionMode: "auto" | "manual";
}>();

const emit = defineEmits<{
  (e: "update:draft", value: string): void;
  (e: "submit", content: string, files: ChatFile[]): void;
}>();

const draft = computed({
  get: () => props.draft,
  set: (value: string) => emit("update:draft", value),
});

const chatStore = useChatStore();

chatStore.primeChatModels();

const selectedModel = computed({
  get: () => chatStore.selectedModel,
  set: (value: string) => chatStore.setSelectedModel(value),
});

const modelOptions = computed(() => chatStore.chatModels);
</script>

