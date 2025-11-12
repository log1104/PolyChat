import { supabase } from "../lib/supabase";

type ChatModelCatalogEntry = {
  id: string;
  label: string;
  position: number;
};

const DEFAULT_CHAT_MODEL_CATALOG: ChatModelCatalogEntry[] = [
  { id: "openai/gpt-4o-mini", label: "OpenAI: GPT-4o Mini", position: 0 },
  { id: "openai/gpt-4.1-mini", label: "OpenAI: GPT-4.1 Mini", position: 1 },
  { id: "openai/gpt-5-mini", label: "OpenAI: GPT-5 Mini", position: 2 },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Google: Gemini 2.5 Flash Lite",
    position: 3,
  },
  { id: "xai/grok-4-fast", label: "xAI: Grok 4 Fast", position: 4 },
  {
    id: "deepseek/deepseek-chat-v3.1:free",
    label: "DeepSeek Chat v3.1 (Free)",
    position: 5,
  },
  { id: "minimax/minimax-m2:free", label: "MiniMax M2 (Free)", position: 6 },
];

export type ChatModelRow = {
  id: string;
  label: string;
  position: number;
};

function mapRows(rows: Array<Record<string, unknown>>): ChatModelRow[] {
  return rows
    .map((row, index) => ({
      id: String(row.model_id ?? row.id ?? ""),
      label: String(row.label ?? ""),
      position:
        typeof row.position === "number" && Number.isFinite(row.position)
          ? row.position
          : index,
    }))
    .filter((row) => row.id && row.label)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function mapCatalog(entries: ChatModelCatalogEntry[]): ChatModelRow[] {
  return entries.map(({ id, label, position }) => ({
    id,
    label,
    position,
  }));
}

async function fetchUserModels(userId: string): Promise<ChatModelRow[]> {
  const { data, error } = await supabase
    .from("user_chat_models")
    .select("model_id, label, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Unable to load models: ${error.message}`);
  }

  return mapRows(data ?? []);
}

async function ensureUserRecord(userId: string) {
  const existing = await supabase
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle<{ id: string }>();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw new Error(
      `Unable to load user profile: ${existing.error.message}`,
    );
  }

  if (existing.data) {
    return;
  }

  let email = `member-${userId}@polychat.local`;

  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const resolvedEmail = authUser?.user?.email;
    if (resolvedEmail && resolvedEmail.trim()) {
      email = resolvedEmail.trim();
    }
  } catch (adminError) {
    console.warn("[chat-models] unable to fetch auth user", adminError);
  }

  const { error } = await supabase
    .from("users")
    .insert({ id: userId, email })
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") {
    throw new Error(
      `Unable to ensure user profile: ${error.message}`,
    );
  }
}

async function seedDefaultsForUser(userId: string): Promise<ChatModelRow[]> {
  await ensureUserRecord(userId);
  const { data: defaults, error } = await supabase
    .from("chat_model_defaults")
    .select("model_id, label, position")
    .order("position", { ascending: true });

  if (error) {
    console.warn(
      "[chat-models] unable to load defaults from table",
      error.message,
    );
  }

  const catalog = (defaults?.length ? mapRows(defaults) : mapCatalog(DEFAULT_CHAT_MODEL_CATALOG)).map(
    (item, index) => ({
      id: item.id,
      label: item.label,
      position:
        typeof item.position === "number" ? item.position : index,
    }),
  );

  if (catalog.length === 0) {
    return [];
  }

  const rows = catalog.map((entry) => ({
    user_id: userId,
    model_id: entry.id,
    label: entry.label,
    position: entry.position,
    updated_at: new Date().toISOString(),
  }));

  const { error: insertError } = await supabase
    .from("user_chat_models")
    .upsert(rows, { onConflict: "user_id,model_id" });

  if (insertError) {
    throw new Error(
      `Unable to seed default models: ${insertError.message}`,
    );
  }

  return await fetchUserModels(userId);
}

export async function listUserChatModels(
  userId: string,
): Promise<ChatModelRow[]> {
  await ensureUserRecord(userId);
  const models = await fetchUserModels(userId);
  if (models.length > 0) {
    return models;
  }
  return await seedDefaultsForUser(userId);
}

export async function addUserChatModel(
  userId: string,
  modelId: string,
  label: string,
): Promise<ChatModelRow[]> {
  await ensureUserRecord(userId);
  const existing = await fetchUserModels(userId);
  if (existing.some((model) => model.id === modelId)) {
    throw new Error("That model is already in your list.");
  }

  const nextPosition =
    existing.length > 0
      ? Math.max(...existing.map((item) => item.position ?? 0)) + 1
      : 0;

  const { error } = await supabase.from("user_chat_models").insert({
    user_id: userId,
    model_id: modelId,
    label,
    position: nextPosition,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to add model: ${error.message}`);
  }

  return await fetchUserModels(userId);
}

export async function removeUserChatModel(
  userId: string,
  modelId: string,
): Promise<ChatModelRow[]> {
  await ensureUserRecord(userId);
  const existing = await fetchUserModels(userId);
  if (existing.length <= 1) {
    throw new Error("At least one model must remain available.");
  }
  if (!existing.some((model) => model.id === modelId)) {
    return existing;
  }

  const { error } = await supabase
    .from("user_chat_models")
    .delete()
    .eq("user_id", userId)
    .eq("model_id", modelId);

  if (error) {
    throw new Error(`Unable to remove model: ${error.message}`);
  }

  const remaining = await fetchUserModels(userId);
  return remaining.length > 0 ? remaining : await seedDefaultsForUser(userId);
}
