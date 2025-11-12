import { DEFAULT_CHAT_MODEL } from "./chatModel";

export type ChatModelCatalogEntry = {
  id: string;
  label: string;
  position: number;
};

export const DEFAULT_CHAT_MODEL_CATALOG: ChatModelCatalogEntry[] = [
  { id: DEFAULT_CHAT_MODEL, label: "OpenAI: GPT-4o Mini", position: 0 },
  { id: "openai/gpt-4.1-mini", label: "OpenAI: GPT-4.1 Mini", position: 1 },
  { id: "openai/gpt-5-mini", label: "OpenAI: GPT-5 Mini", position: 2 },
  { id: "google/gemini-2.5-flash-lite", label: "Google: Gemini 2.5 Flash Lite", position: 3 },
  { id: "xai/grok-4-fast", label: "xAI: Grok 4 Fast", position: 4 },
  { id: "deepseek/deepseek-chat-v3.1:free", label: "DeepSeek Chat v3.1 (Free)", position: 5 },
  { id: "minimax/minimax-m2:free", label: "MiniMax M2 (Free)", position: 6 }
];
