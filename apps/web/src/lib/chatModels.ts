import { DEFAULT_CHAT_MODEL } from "../../../../shared/chatModel";

export const CHAT_MODEL_OPTIONS = [
  { label: "OpenAI: GPT-4o Mini", value: DEFAULT_CHAT_MODEL },
  { label: "OpenAI: GPT-4.1 Mini", value: "openai/gpt-4.1-mini" },
  { label: "OpenAI: GPT-5 Mini", value: "openai/gpt-5-mini" },
  { label: "Google: Gemini 2.5 Flash Lite", value: "google/gemini-2.5-flash-lite" },
  { label: "xAI: Grok 4 Fast", value: "xai/grok-4-fast" },
  { label: "DeepSeek Chat v3.1 (Free)", value: "deepseek/deepseek-chat-v3.1:free" },
  { label: "MiniMax M2 (Free)", value: "minimax/minimax-m2:free" },
];

export function getChatModelLabel(modelId?: string): string {
  if (!modelId) return "Unknown model";
  return (
    CHAT_MODEL_OPTIONS.find((option) => option.value === modelId)?.label ??
    modelId
  );
}

