<template>
  <div class="flex flex-col gap-4 overflow-y-auto pr-3">
    <template v-if="messages.length">
      <article
        v-for="message in messages"
        :key="message.id"
        class="max-w-3xl rounded-2xl p-4 shadow-card"
        :class="bubbleClass(message)"
      >
        <header
          class="mb-2 flex items-center justify-between text-xs uppercase tracking-wide opacity-85"
          :class="message.role === 'user' ? 'text-slate-400' : 'text-white/90'"
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
      </article>
    </template>

    <p v-else class="text-center text-sm text-slate-400">
      Send your first message to begin chatting with the
      <span class="font-semibold">{{ mentorLabel(activeMentor) }}</span
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { ChatMessage } from "../stores/chat";
import { getMentorThemeClasses } from "@/design/tokens";

defineProps<{
  messages: ChatMessage[];
  activeMentor: string;
}>();

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

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>
