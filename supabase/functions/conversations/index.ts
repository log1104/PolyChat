import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS"
};

const listConversationsSchema = z.object({
  userId: z.string()
});

const createConversationSchema = z.object({
  userId: z.string().optional(),
  mentorId: z.string().optional()
});

const deleteConversationSchema = z.object({
  userId: z.string(),
  conversationId: z.string()
});

const PREVIEW_MAX_LENGTH = 80;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return respond(
      { error: true, message: "Supabase environment variables are not configured." },
      500
    );
  }

  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    if (req.method === "GET") {
      const params = listConversationsSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
      const result = await listConversations(supabaseClient, params.userId);
      return respond(result, 200);
    }

    if (req.method === "POST") {
      const payload = createConversationSchema.parse(await req.json());
      const userId = await ensureUser(supabaseClient, payload.userId);
      const result = await createConversation(supabaseClient, userId, payload.mentorId);
      return respond(result, 200);
    }

    if (req.method === "DELETE") {
      const payload = deleteConversationSchema.parse(await req.json());
      await deleteConversation(supabaseClient, payload.userId, payload.conversationId);
      return respond({ success: true }, 200);
    }

    return respond({ error: true, message: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[conversations] error", error);

    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const details = zodError.flatten();
      return respond({ error: true, message: "Invalid payload", details }, 400);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond({ error: true, message }, 500);
  }
});

async function listConversations(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string
) {
  const { data, error } = await supabaseClient
    .from("conversations")
    .select("id, user_id, mentor, title, created_at, preview, last_message_at")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to list conversations: ${error.message}`);
  }

  const conversations = data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    mentorId: row.mentor as string,
    title: row.title as string,
    createdAt: row.created_at as string,
    preview: toPreview((row.preview as string | null) ?? (row.title as string | null)),
    lastMessageAt: (row.last_message_at as string | null) ?? undefined
  }));

  return { conversations };
}

async function createConversation(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  mentorId?: string
) {
  const { data, error } = await supabaseClient
    .from("conversations")
    .insert({
      user_id: userId,
      mentor: mentorId ?? "general",
      title: null,
      preview: null,
      last_message_at: new Date().toISOString()
    })
    .select("id, user_id, mentor, title, created_at, preview, last_message_at")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? "Unknown error"}`);
  }

  return {
    id: data.id as string,
    userId: data.user_id as string,
    mentorId: data.mentor as string,
    title: data.title as string,
    createdAt: data.created_at as string,
    preview: toPreview((data.preview as string | null) ?? (data.title as string | null)),
    lastMessageAt: (data.last_message_at as string | null) ?? undefined
  };
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function toPreview(value: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

async function deleteConversation(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  conversationId: string
) {
  const { data: existing, error: fetchError } = await supabaseClient
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to verify conversation ownership: ${fetchError.message}`);
  }

  if (!existing) {
    throw new Error("Conversation not found or does not belong to the user");
  }

  const { error: deleteError } = await supabaseClient
    .from("conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Failed to delete conversation: ${deleteError.message}`);
  }
}

async function ensureUser(
  supabaseClient: ReturnType<typeof createClient>,
  userId?: string
): Promise<string> {
  if (userId) {
    return userId;
  }

  const email = `guest-${crypto.randomUUID()}@polychat.local`;

  const { data, error } = await supabaseClient
    .from("users")
    .insert({ email })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? "Unknown error"}`);
  }

  return data.id as string;
}