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
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  files: z.array(z.object({
    name: z.string(),
    url: z.string(),
    type: z.string(),
    size: z.number()
  })).optional(),
  mentorId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional()
});

const getConversationSchema = z.object({
  conversationId: z.string(),
  userId: z.string().optional()
});

const PREVIEW_MAX_LENGTH = 80;

type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

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

  // Health check endpoint
  if (new URL(req.url).pathname.endsWith('/health')) {
    return respond({ status: 'ok' }, 200);
  }

  try {
    if (req.method === "POST") {
      const payload = chatRequestSchema.parse(await req.json());
      const result = await handleChatRequest(supabaseClient, payload);
      return respond(result, 200);
    }

    if (req.method === "GET") {
      const params = getConversationSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
      const result = await getConversation(supabaseClient, params.conversationId, params.userId);
      return respond(result, 200);
    }

    return respond({ error: true, message: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[chat] error", error);

    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const details = zodError.flatten();
      return respond({ error: true, message: "Invalid payload", details }, 400);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond({ error: true, message }, 500);
  }
});

async function handleChatRequest(
  supabaseClient: ReturnType<typeof createClient>,
  payload: ChatRequestPayload
) {
  const mentorId = payload.mentorId ?? "bible";

  const userId = await ensureUser(supabaseClient, payload.userId);
  const { id: conversationId, created: conversationCreated } = await ensureConversation(
    supabaseClient,
    userId,
    mentorId,
    payload.sessionId
  );

  await insertMessage(supabaseClient, conversationId, "user", payload.message, mentorId, payload.files);
  await updateConversationSummary(
    supabaseClient,
    conversationId,
    payload.message,
    "user",
    conversationCreated
  );

  const assistantReply = `This is a placeholder response until mentor intelligence is integrated. You said: ${payload.message}`;

  await insertMessage(supabaseClient, conversationId, "assistant", assistantReply, mentorId);
  await updateConversationSummary(supabaseClient, conversationId, assistantReply, "assistant", false);

  const history = await fetchConversationMessages(supabaseClient, conversationId);

  return {
    conversationId,
    userId,
    mentorId,
    reply: assistantReply,
    history
  };
}

async function getConversation(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string,
  userId?: string
) {
  const { data, error } = await supabaseClient
    .from("conversations")
    .select("id, user_id, mentor")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  if (!data) {
    throw new Error("Conversation not found");
  }

  if (userId && data.user_id !== userId) {
    throw new Error("Conversation does not belong to the supplied user");
  }

  const history = await fetchConversationMessages(supabaseClient, conversationId);

  return {
    conversationId: data.id as string,
    userId: data.user_id as string,
    mentorId: data.mentor as string,
    history
  };
}

async function ensureUser(
  supabaseClient: ReturnType<typeof createClient>,
  existingUserId?: string
): Promise<string> {
  if (existingUserId) {
    return existingUserId;
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

async function ensureConversation(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  mentorId: string,
  existingConversationId?: string
): Promise<{ id: string; created: boolean }> {
  if (existingConversationId) {
    const { data, error } = await supabaseClient
      .from("conversations")
      .select("id, preview")
      .eq("id", existingConversationId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load conversation: ${error.message}`);
    }

    if (!data) {
      // Conversation id not found; create a new one to keep flow working
      return await ensureConversation(supabaseClient, userId, mentorId, undefined);
    }

    return { id: data.id as string, created: data.preview == null };
  }

  const { data, error } = await supabaseClient
    .from("conversations")
    .insert({
      user_id: userId,
      mentor: mentorId,
      title: null,
      preview: null,
      last_message_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? "Unknown error"}`);
  }

  return { id: data.id as string, created: true };
}

async function insertMessage(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  mentorId: string,
  files?: { name: string; url: string; type: string; size: number }[]
) {
  const { error } = await supabaseClient.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    metadata: { mentor: mentorId, files: files || [] }
  });

  if (error) {
    throw new Error(`Failed to insert ${role} message: ${error.message}`);
  }
}

async function updateConversationSummary(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string,
  content: string,
  role: "user" | "assistant",
  _isNewConversation: boolean
) {
  const nowIso = new Date().toISOString();

  if (role === "user") {
    const snippet = buildPreviewSnippet(content);
    if (snippet) {
      const { error: previewError } = await supabaseClient
        .from("conversations")
        .update({ preview: snippet, title: snippet })
        .eq("id", conversationId)
        .is("preview", null);

      if (previewError) {
        console.error("[chat] failed to set conversation preview", previewError);
      }
    }
  }

  const { error } = await supabaseClient
    .from("conversations")
    .update({ last_message_at: nowIso })
    .eq("id", conversationId);

  if (error) {
    console.error("[chat] failed to update conversation timestamp", error);
  }
}

function buildPreviewSnippet(content: string): string {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, PREVIEW_MAX_LENGTH - 1)}…`;
}

async function fetchConversationMessages(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string
) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id, role, content, created_at, metadata")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to load conversation messages: ${error?.message ?? "Unknown error"}`);
  }

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    role: row.role as "user" | "assistant" | "system",
    content: row.content as string,
    createdAt: row.created_at as string,
    mentor: (row.metadata as any)?.mentor || "general",
    files: (row.metadata as any)?.files || []
  }));
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
