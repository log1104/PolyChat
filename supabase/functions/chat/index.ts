import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  mentorId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional()
});

const getConversationSchema = z.object({
  conversationId: z.string(),
  userId: z.string().optional()
});

type ChatRequestPayload = z.infer<typeof chatRequestSchema>;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("LOCAL_SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("LOCAL_SUPABASE_SERVICE_ROLE_KEY");

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
      return respond({ error: true, message: "Invalid payload", details: error.flatten() }, 400);
    }

    return respond({ error: true, message: error?.message ?? "Unexpected error" }, 500);
  }
});

async function handleChatRequest(
  supabaseClient: ReturnType<typeof createClient>,
  payload: ChatRequestPayload
) {
  const mentorId = payload.mentorId ?? "bible";

  const userId = await ensureUser(supabaseClient, payload.userId);
  const conversationId = await ensureConversation(supabaseClient, userId, mentorId, payload.sessionId);

  await insertMessage(supabaseClient, conversationId, "user", payload.message, mentorId);

  const assistantReply = `This is a placeholder response until mentor intelligence is integrated. You said: ${payload.message}`;

  await insertMessage(supabaseClient, conversationId, "assistant", assistantReply, mentorId);

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
): Promise<string> {
  if (existingConversationId) {
    return existingConversationId;
  }

  const { data, error } = await supabaseClient
    .from("conversations")
    .insert({
      user_id: userId,
      mentor: mentorId,
      title: `Session started ${new Date().toLocaleString()}`
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? "Unknown error"}`);
  }

  return data.id as string;
}

async function insertMessage(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  mentorId: string
) {
  const { error } = await supabaseClient.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    metadata: { mentor: mentorId }
  });

  if (error) {
    throw new Error(`Failed to insert ${role} message: ${error.message}`);
  }
}

async function fetchConversationMessages(
  supabaseClient: ReturnType<typeof createClient>,
  conversationId: string
) {
  const { data, error } = await supabaseClient
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to load conversation messages: ${error?.message ?? "Unknown error"}`);
  }

  return data.map((row) => ({
    id: row.id as string,
    role: row.role as "user" | "assistant" | "system",
    content: row.content as string,
    createdAt: row.created_at as string
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
