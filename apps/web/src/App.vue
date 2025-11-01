<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import ChatWindow from './components/ChatWindow.vue';
import MentorBadge from './components/MentorBadge.vue';
import { useChatStore } from './stores/chat';

const chatStore = useChatStore();

const mentors = reactive([
  { id: 'general', name: 'General Mentor', description: 'All-purpose reasoning assistant' },
  { id: 'bible', name: 'Bible Mentor', description: 'Scripture study and theology' },
  { id: 'chess', name: 'Chess Mentor', description: 'Position analysis and strategy' },
  { id: 'stock', name: 'Stock Mentor', description: 'Market indicators and insights' }
]);

const draft = ref('');

const messages = computed(() => chatStore.orderedMessages);
const activeMentor = computed(() => chatStore.activeMentor);
const isSending = computed(() => chatStore.isSending);
const error = computed(() => chatStore.error);

const handleMentorSelect = (mentorId: string) => {
  chatStore.setMentor(mentorId);
};

const updateDraft = (value: string) => {
  draft.value = value;
};

const submitMessage = async (message: string) => {
  await chatStore.sendMessage(message);
  draft.value = '';
};

const resetChat = () => {
  chatStore.resetChat();
  draft.value = '';
};

onMounted(() => {
  chatStore.initializeFromStorage();
});
</script>

<template>
  <main class="min-h-screen bg-slate-950 text-slate-50">
    <div class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row lg:py-12">
      <aside class="w-full space-y-4 rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 shadow-card lg:w-72">
        <header class="mb-3">
          <h1 class="text-lg font-semibold text-slate-100">Mentor System</h1>
          <p class="text-sm text-slate-400">Select a mentor to guide your next conversation.</p>
        </header>

        <ul class="space-y-3">
          <li v-for="mentor in mentors" :key="mentor.id">
            <button
              type="button"
              class="w-full rounded-2xl border border-slate-800/60 p-4 text-left transition hover:border-mentor hover:bg-slate-800/70"
              :class="{
                'border-mentor bg-slate-800/70 text-white shadow-card': mentor.id === activeMentor
              }"
              @click="handleMentorSelect(mentor.id)"
            >
              <div class="flex items-center justify-between">
                <span class="font-semibold">{{ mentor.name }}</span>
                <MentorBadge v-if="mentor.id === activeMentor" :mentor-id="mentor.id" :title="'Active'" />
              </div>
              <p class="mt-1 text-xs text-slate-400">{{ mentor.description }}</p>
            </button>
          </li>
        </ul>
      </aside>

      <section class="flex-1">
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
  </main>
</template>
