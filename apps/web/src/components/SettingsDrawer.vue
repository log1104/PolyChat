<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-50 flex pointer-events-none">
        <aside
          id="settings-drawer"
          ref="panelRef"
          class="pointer-events-auto flex h-full w-80 flex-col bg-slate-900 text-slate-100 shadow-2xl ring-1 ring-slate-700/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-drawer-title"
          tabindex="-1"
          @keydown.esc.prevent.stop="emitClose"
        >
          <header
            class="flex items-center justify-between border-b border-slate-800 px-5 py-4"
          >
            <h2
              id="settings-drawer-title"
              class="text-sm font-semibold uppercase tracking-wide text-slate-300"
            >
              Settings
            </h2>
            <button
              ref="closeButton"
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200/70"
              @click="emitClose"
            >
              <span class="sr-only">Close settings</span>
              X
            </button>
          </header>

          <div class="flex-1 space-y-6 overflow-y-auto px-5 py-4">
            <section>
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                Appearance
              </h3>
              <p class="mt-1 text-xs text-slate-500">
                Choose your preferred color theme. This setting applies to this
                device.
              </p>
              <div
                class="mt-3 grid grid-cols-2 gap-2"
                role="group"
                aria-label="Theme selection"
              >
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  type="button"
                  class="flex flex-col items-start rounded-xl border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  :class="themeButtonClasses(option.value)"
                  :aria-pressed="theme === option.value"
                  @click="emitTheme(option.value)"
                >
                  <span class="text-sm font-semibold">{{ option.label }}</span>
                  <span class="text-xs text-slate-400">{{
                    option.description
                  }}</span>
                </button>
              </div>
            </section>

            <section>
              <h3
                class="text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                System
              </h3>
              <p class="mt-1 text-xs text-slate-500">
                Light mode mirrors modern productivity apps. Dark mode matches
                the original PolyChat aesthetic.
              </p>
            </section>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from "vue";

const props = defineProps<{
  open: boolean;
  theme: "light" | "dark";
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "update:theme", value: "light" | "dark"): void;
}>();

const closeButton = ref<HTMLButtonElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const themeOptions = [
  { value: "light", label: "Light", description: "Bright surfaces" },
  { value: "dark", label: "Dark", description: "Low-light friendly" },
] as const;

const emitClose = () => {
  emit("close");
};

const emitTheme = (value: "light" | "dark") => {
  emit("update:theme", value);
};

const themeButtonClasses = (value: "light" | "dark") => {
  const isActive = props.theme === value;
  if (value === "light") {
    return isActive
      ? "border-slate-200 bg-slate-100 text-slate-900"
      : "border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800";
  }
  return isActive
    ? "border-slate-600 bg-slate-800 text-slate-100"
    : "border-slate-700/60 bg-slate-800/60 text-slate-200 hover:border-slate-600 hover:bg-slate-800";
};

watch(
  () => props.open,
  (open) => {
    if (open) {
      nextTick(() => {
        if (panelRef.value) {
          panelRef.value.focus({ preventScroll: true });
        }
        closeButton.value?.focus({ preventScroll: true });
      });
    }
  },
);
</script>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from aside {
  transform: translateX(-100%);
}

.drawer-enter-to aside {
  transform: translateX(0);
}

.drawer-leave-active aside {
  transform: translateX(-100%);
}
</style>
