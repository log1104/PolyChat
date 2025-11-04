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

      <!-- Attached files preview -->
      <div v-if="selectedFiles.length" class="mt-2 flex flex-wrap gap-2">
        <div
          v-for="(file, index) in selectedFiles"
          :key="index"
          class="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 p-2 text-xs text-slate-300"
        >
          <img
            v-if="file.type.startsWith('image/')"
            :src="getObjectURL(file)"
            class="h-8 w-8 rounded object-cover"
            alt="Preview"
          />
          <span v-else class="text-lg">{{ getFileIcon(file.type) }}</span>
          <div class="flex-1 min-w-0">
            <div class="truncate font-medium">{{ file.name }}</div>
            <div class="text-slate-500">{{ formatFileSize(file.size) }}</div>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-200"
            @click="removeFile(index)"
          >
            ✕
          </button>
        </div>
      </div>
    </label>

    <!-- Single unified upload input/button (auto-detects file type) -->
    <input
      ref="fileInput"
      type="file"
      accept="image/*,.txt,.pdf,.docx,.csv"
      multiple
      class="hidden"
      @change="handleUploadSelect"
    />

    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700"
      :disabled="disabled"
      @click="triggerUpload"
    >
      <span class="sr-only">Upload</span>
      📎
    </button>

    <button
      type="button"
      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-mentor text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="disabled || (!draft.trim() && selectedFiles.length === 0)"
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
import { ref, watch } from "vue";
import { supabase } from "@/lib/supabase";
import { mentorColorTokens } from "@/design/tokens";
import type { ChatFile } from "@/stores/chat";

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
  mentorId: string;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "submit", content: string, files: ChatFile[]): void;
}>();

const draft = ref(props.modelValue);
const selectedFiles = ref<File[]>([]);
const fileInput = ref<HTMLInputElement>();

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

watch(draft, (value) => emit("update:modelValue", value));

const getObjectURL = (file: File) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).URL.createObjectURL(file);
};

const revokeObjectURL = (url: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).URL.revokeObjectURL(url);
};

const triggerUpload = () => fileInput.value?.click();

const handleUploadSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files) {
    selectedFiles.value.push(...Array.from(target.files));
  }
};

const removeFile = (index: number) => {
  const file = selectedFiles.value[index];
  if (file && file.type.startsWith("image/")) {
    revokeObjectURL(getObjectURL(file)); // Clean up
  }
  selectedFiles.value.splice(index, 1);
};

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return "🖼️";
  if (type.includes("pdf")) return "📄";
  if (type.includes("text") || type.includes("csv")) return "📄";
  return "📎";
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const emitSubmit = async () => {
  if (!draft.value.trim() && selectedFiles.value.length === 0) return;

  // Upload files to Supabase
  const uploadedFiles: ChatFile[] = [];
  for (const file of selectedFiles.value) {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(fileName, file);

      if (error) throw error;
      uploadedFiles.push({
        name: file.name,
        url: data.path,
        type: file.type,
        size: file.size,
      });
    } catch (error) {
      console.error("Upload failed:", error);
      // For now, skip failed uploads
    }
  }

  emit("submit", draft.value, uploadedFiles);
  draft.value = "";
  // Clean up object URLs
  selectedFiles.value.forEach((file) => {
    if (file.type.startsWith("image/")) {
      revokeObjectURL(getObjectURL(file));
    }
  });
  selectedFiles.value = [];
  // Reset inputs
  if (fileInput.value) fileInput.value.value = "";
};

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
