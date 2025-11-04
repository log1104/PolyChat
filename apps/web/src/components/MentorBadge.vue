<template>
  <div
    class="inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium shadow-card transition-colors"
    :class="badgeClass"
  >
    <span class="inline-flex h-2.5 w-2.5 rounded-full bg-white/90"></span>
    <span>{{ title }}</span>
    <svg
      v-if="isManual"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="h-3 w-3 opacity-75"
    >
      <path
        fill-rule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clip-rule="evenodd"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getMentorThemeClasses } from "@/design/tokens";

const props = defineProps<{
  mentorId: string;
  title: string;
  isManual?: boolean;
}>();

const badgeClass = computed(() => {
  const theme = getMentorThemeClasses(props.mentorId as never);
  return theme.badge ?? "bg-slate-600";
});
</script>
