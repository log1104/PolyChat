<template>
  <form
    class="flex items-end gap-3 rounded-3xl border border-slate-800/60 bg-slate-900/60 p-4 shadow-card"
  >
    <label class="flex-1">
      <span class="sr-only">Message</span>
      <textarea
        v-model="draft"
        :disabled="disabled"
        rows="3"
        class="h-20 w-full resize-none rounded-2xl border border-slate-800/60 bg-slate-950/80 p-3 text-sm text-slate-100 placeholder-slate-400 shadow-inner focus:border-mentor focus:outline-none"
        placeholder="Ask a question or request help…"
        @keydown.enter.prevent="handleEnter"
      />
    </label>

    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mentor text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="disabled || !draft.trim()"
      @click="emitSubmit"
    >
      <span class="sr-only">Send</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.5"
          d="M4.5 12h15m0 0l-6-6m6 6-6 6"
        />
      </svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { mentorColorTokens } from "@/design/tokens";

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  mentorId: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "submit"): void;
}>();

const draft = ref(props.modelValue);

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value;
  },
);

watch(
  () => props.mentorId,
  (value) => {
    const root = document.documentElement;
    const tokens = mentorColorTokens[value as keyof typeof mentorColorTokens];
    root.style.setProperty("--mentor", tokens?.base ?? "#4338ca");
  },
  { immediate: true },
);

const emitSubmit = () => {
  if (!draft.value.trim()) return;

  emit("submit");
};

watch(draft, (value) => emit("update:modelValue", value));

const disabled = computed(() => props.disabled ?? false);

const handleEnter = (event: KeyboardEvent) => {
  if (!event.shiftKey) {
    event.preventDefault();
    emitSubmit();
  }
};
</script>

<style scoped>
:root {
  --mentor: #4338ca;
}

.bg-mentor {
  background: var(--mentor);
}
</style>
