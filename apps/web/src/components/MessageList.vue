<template>
  <div ref="messageContainer" class="flex flex-col gap-4 overflow-y-auto pr-3">
    <template v-if="messages.length">
      <Transition
        v-for="message in messages"
        :key="message.id"
        name="message"
        appear
      >
        <article
          class="max-w-3xl rounded-2xl p-4 shadow-card"
          :class="bubbleClass(message)"
        >
          <header
            class="mb-2 flex items-center justify-between text-xs uppercase tracking-wide opacity-85"
            :class="
              message.role === 'user' ? 'text-slate-400' : 'text-white/90'
            "
          >
            <span>{{
              message.role === "user" ? "You" : mentorLabel(message.mentor)
            }}</span>
            <time>{{ formatTimestamp(message.createdAt) }}</time>
          </header>
          <p
            class="whitespace-pre-line text-sm leading-relaxed"
            :class="message.role === 'user' ? 'text-slate-100' : 'text-white'"
          >
            {{ message.content }}
          </p>
          <p
            v-if="message.role === 'assistant' && message.model"
            class="mt-2 text-xs text-slate-200/70"
          >
            Reply generated with {{ modelLabel(message.model) }}.
          </p>
          <div
            v-if="message.files && message.files.length"
            class="mt-2 space-y-2"
          >
            <div
              v-for="file in message.files"
              :key="file.name"
              class="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 p-2 text-xs text-slate-300"
            >
              <span class="text-lg">{{
                file.type.startsWith("image/") ? "🖼️" : "📁"
              }}</span>
              <div class="flex-1">
                <div class="font-medium">{{ file.name }}</div>
                <div class="text-slate-500">
                  {{ formatFileSize(file.size) }}
                </div>
              </div>
            </div>
          </div>
        </article>
      </Transition>
    </template>

    <p v-else class="text-center text-sm text-slate-400">
      Send your first message to begin chatting with the
      <span class="font-semibold">{{ mentorLabel(activeMentor) }}</span
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import type { ChatMessage } from "../stores/chat";
import { getMentorThemeClasses } from "@/design/tokens";
import { getChatModelLabel } from "../lib/chatModels";

const props = defineProps<{
  messages: ChatMessage[];
  activeMentor: string;
}>();

const messageContainer = ref<HTMLDivElement>();

// Auto-scroll to bottom when messages change
watch(
  () => props.messages.length,
  async () => {
    await nextTick();
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  },
  { immediate: true },
);

const bubbleClass = (message: ChatMessage) => {
  if (message.role === "user") {
    return "ml-auto bg-slate-800/90 text-slate-50 border border-slate-700 rounded-2xl";
  }

  const theme = getMentorThemeClasses(message.mentor as never);
  // gradient bubble with no border
  return `${theme.bubble ?? "bg-slate-700 text-white"} border-0 rounded-2xl`;
};

const mentorLabel = (mentorId: string) => {
  switch (mentorId) {
    case "bible":
      return "Bible Mentor";
    case "chess":
      return "Chess Mentor";
    case "stock":
      return "Stock Mentor";
    default:
      return "General Mentor";
  }
};

const modelLabel = (modelId: string) => getChatModelLabel(modelId);

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
</script>

<style scoped>
.message-enter-active {
  transition: all 0.3s ease-out;
}

.message-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(10px);
}

.message-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
