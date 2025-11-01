<template>
  <section class="flex h-full flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-card">
    <header class="flex items-center justify-between">
      <MentorBadge :mentor-id="activeMentor" :title="mentorTitle" />

      <div class="flex items-center gap-2 text-xs text-slate-400">
        <span class="inline-flex items-center gap-1">
          <span class="h-2 w-2 rounded-full border border-slate-300 bg-emerald-400"></span>
          {{ isSending ? 'Thinking…' : 'Ready' }}
        </span>
        <button
          type="button"
          class="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-mentor hover:text-white"
          @click="$emit('reset')"
        >
          Clear chat
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-hidden">
      <MessageList :messages="messages" :active-mentor="activeMentor" class="h-full" />
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
      @submit="$emit('submit', draft)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ChatMessage } from '../stores/chat';
import MentorBadge from './MentorBadge.vue';
import MessageList from './MessageList.vue';
import MessageInput from './MessageInput.vue';

const props = defineProps<{
  messages: ChatMessage[];
  activeMentor: string;
  isSending: boolean;
  draft: string;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:draft', value: string): void;
  (e: 'submit', value: string): void;
  (e: 'reset'): void;
}>();

const draft = computed({
  get: () => props.draft,
  set: (value: string) => emit('update:draft', value)
});

const mentorTitle = computed(() => {
  switch (props.activeMentor) {
    case 'bible':
      return 'Bible Mentor';
    case 'chess':
      return 'Chess Mentor';
    case 'stock':
      return 'Stock Mentor';
    default:
      return 'General Mentor';
  }
});
</script>
