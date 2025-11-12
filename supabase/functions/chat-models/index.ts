import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import {
  DEFAULT_CHAT_MODEL_CATALOG,
  type ChatModelCatalogEntry,
} from "../../../shared/chatModel.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

type AnySupabaseClient = SupabaseClient<any, any, any>;

const listQuerySchema = z.object({
  userId: z.string().uuid(),
});

const createModelSchema = listQuerySchema.extend({
  modelId: z.string().trim().min(1, "Model ID is required"),
  label: z.string().trim().min(1, "Label is required"),
});

const deleteModelSchema = listQuerySchema.extend({
  modelId: z.string().trim().min(1, "Model ID is required"),
});

type ChatModelRow = {
  id: string;
  label: string;
  position: number;
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return respond(
      { error: true, message: "Supabase environment variables are not configured." },
      500,
    );
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    if (req.method === "GET") {
      const params = listQuerySchema.parse(
        Object.fromEntries(new URL(req.url).searchParams),
      );
      const models = await listModels(client, params.userId);
      return respond({ models });
    }

    if (req.method === "POST") {
      const payload = createModelSchema.parse(await req.json());
      const models = await createModel(client, payload);
      return respond({ models }, 201);
    }

    if (req.method === "DELETE") {
      const payload = deleteModelSchema.parse(await req.json());
      const models = await deleteModel(client, payload);
      return respond({ models });
    }

    return respond({ error: true, message: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[chat-models]", error);

    if (error instanceof z.ZodError) {
      const details = (error as z.ZodError).flatten();
      return respond({ error: true, message: "Invalid payload", details }, 400);
    }

    if (error instanceof ApiError) {
      return respond({ error: true, message: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond({ error: true, message }, 500);
  }
});

async function listModels(
  client: AnySupabaseClient,
  userId: string,
): Promise<ChatModelRow[]> {
  await ensureUserRecord(client, userId);
  const { data, error } = await client
    .from("user_chat_models")
    .select("model_id, label, position")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  if (error) {
    throw new Error(`Unable to load models: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return await seedDefaultsForUser(client, userId);
  }

  return mapRows(data);
}

async function createModel(
  client: AnySupabaseClient,
  payload: z.infer<typeof createModelSchema>,
): Promise<ChatModelRow[]> {
  const trimmedId = payload.modelId.trim();
  const trimmedLabel = payload.label.trim();

  const existing = await client
    .from("user_chat_models")
    .select("id")
    .eq("user_id", payload.userId)
    .eq("model_id", trimmedId)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw new Error(`Unable to check existing models: ${existing.error.message}`);
  }

  if (existing.data) {
    throw new ApiError(409, "That model is already in your list.");
  }

  const { data: maxPosition } = await client
    .from("user_chat_models")
    .select("position")
    .eq("user_id", payload.userId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = typeof maxPosition?.position === "number"
    ? maxPosition.position + 1
    : 0;

  const { error } = await client.from("user_chat_models").insert({
    user_id: payload.userId,
    model_id: trimmedId,
    label: trimmedLabel,
    position: nextPosition,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Unable to add model: ${error.message}`);
  }

  return await listModels(client, payload.userId);
}

async function deleteModel(
  client: AnySupabaseClient,
  payload: z.infer<typeof deleteModelSchema>,
): Promise<ChatModelRow[]> {
  const { count, error: countError } = await client
    .from("user_chat_models")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", payload.userId);

  if (countError) {
    throw new Error(`Unable to check model count: ${countError.message}`);
  }

  if (typeof count === "number" && count <= 1) {
    throw new ApiError(400, "At least one model must remain available.");
  }

  const { error } = await client
    .from("user_chat_models")
    .delete()
    .eq("user_id", payload.userId)
    .eq("model_id", payload.modelId);

  if (error) {
    throw new Error(`Unable to remove model: ${error.message}`);
  }

  return await listModels(client, payload.userId);
}

async function seedDefaultsForUser(
  client: AnySupabaseClient,
  userId: string,
): Promise<ChatModelRow[]> {
  await ensureUserRecord(client, userId);
  const { data: defaults, error } = await client
    .from("chat_model_defaults")
    .select("model_id, label, position")
    .order("position", { ascending: true });

  if (error) {
    console.warn("[chat-models] unable to load defaults from table", error.message);
  }

  const catalog = (defaults?.length ? mapRows(defaults) : mapCatalog(DEFAULT_CHAT_MODEL_CATALOG))
    .map((item, index) => ({
      id: item.id,
      label: item.label,
      position: typeof item.position === "number" ? item.position : index,
    }));

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

  const { error: insertError } = await client
    .from("user_chat_models")
    .upsert(rows, { onConflict: "user_id,model_id" });

  if (insertError) {
    throw new Error(`Unable to seed default models: ${insertError.message}`);
  }

  return await listModels(client, userId);
}

function mapRows(rows: Array<Record<string, unknown>>): ChatModelRow[] {
  return rows
    .map((row) => ({
      id: String(row.model_id ?? row.id ?? ""),
      label: String(row.label ?? ""),
      position: typeof row.position === "number" ? row.position : 0,
    }))
    .filter((row) => row.id && row.label)
    .sort((a, b) => a.position - b.position);
}

function mapCatalog(entries: ChatModelCatalogEntry[]): ChatModelRow[] {
  return entries.map(({ id, label, position }) => ({ id, label, position }));
}

async function ensureUserRecord(client: AnySupabaseClient, userId: string) {
  const existing = await client
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    throw new Error(`Unable to load user profile: ${existing.error.message}`);
  }

  if (existing.data) {
    return;
  }

  let email = `member-${userId}@polychat.local`;

  try {
    const { data: authUser } = await client.auth.admin.getUserById(userId);
    const resolvedEmail = authUser?.user?.email;
    if (resolvedEmail && resolvedEmail.trim()) {
      email = resolvedEmail.trim();
    }
  } catch (adminError) {
    console.warn("[chat-models] unable to fetch auth user", adminError);
  }

  const { error: insertError } = await client
    .from("users")
    .insert({ id: userId, email })
    .select("id")
    .maybeSingle();

  if (insertError && insertError.code !== "23505") {
    throw new Error(`Unable to ensure user profile: ${insertError.message}`);
  }
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export {
  mapCatalog,
  mapRows,
  seedDefaultsForUser,
  listModels,
  createModel,
  deleteModel,
};
export type { ChatModelRow };
