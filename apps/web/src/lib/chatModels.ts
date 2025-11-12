import { DEFAULT_CHAT_MODEL_CATALOG } from "../../../../shared/chatModelCatalog";

export type ChatModelOption = {
  id: string;
  label: string;
  position?: number;
};

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = DEFAULT_CHAT_MODEL_CATALOG.map(
  ({ id, label, position }) => ({ id, label, position }),
);

export function getChatModelLabel(modelId?: string): string {
  if (!modelId) return "Unknown model";
  return (
    CHAT_MODEL_OPTIONS.find((option) => option.id === modelId)?.label ??
    modelId
  );
}

