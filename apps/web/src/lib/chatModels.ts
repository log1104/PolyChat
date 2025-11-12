import { DEFAULT_CHAT_MODEL } from "../../../../shared/chatModel";

export type ChatModelOption = {
  id: string;
  label: string;
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { label: "OpenAI: GPT-4o Mini", id: DEFAULT_CHAT_MODEL },
  { label: "OpenAI: GPT-4.1 Mini", id: "openai/gpt-4.1-mini" },
  { label: "OpenAI: GPT-5 Mini", id: "openai/gpt-5-mini" },
  { label: "Google: Gemini 2.5 Flash Lite", id: "google/gemini-2.5-flash-lite" },
  { label: "xAI: Grok 4 Fast", id: "xai/grok-4-fast" },
  { label: "DeepSeek Chat v3.1 (Free)", id: "deepseek/deepseek-chat-v3.1:free" },
  { label: "MiniMax M2 (Free)", id: "minimax/minimax-m2:free" },
];

export function getChatModelLabel(modelId?: string): string {
  if (!modelId) return "Unknown model";
  return (
    CHAT_MODEL_OPTIONS.find((option) => option.id === modelId)?.label ??
    modelId
  );
}

