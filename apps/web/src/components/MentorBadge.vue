<template>
  <div
    class="inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium shadow-card transition-colors"
    :class="badgeClass"
  >
    <span class="inline-flex h-2.5 w-2.5 rounded-full bg-white/90"></span>
    <span>{{ title }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getMentorThemeClasses } from '@/design/tokens';

const props = defineProps<{
  mentorId: string;
  title: string;
}>();

const badgeClass = computed(() => {
  const theme = getMentorThemeClasses(props.mentorId as never);
  return theme.badge ?? 'bg-slate-600';
});
</script>
