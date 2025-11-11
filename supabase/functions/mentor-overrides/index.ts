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

const mentorOverrideQuerySchema = z.object({
  userId: z.string().uuid(),
  mentorId: z.string().trim().min(1).default("general")
});

const createMentorOverrideSchema = mentorOverrideQuerySchema.extend({
  systemPrompt: z.string().trim().min(1, "System prompt cannot be empty")
});

type MentorOverrideResponse = {
  mentorId: string;
  systemPrompt: string | null;
};

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
      const params = mentorOverrideQuerySchema.parse(
        Object.fromEntries(new URL(req.url).searchParams),
      );

      const { data, error } = await supabaseClient
        .from("mentor_overrides")
        .select("mentor_id, system_prompt")
        .eq("user_id", params.userId)
        .eq("mentor_id", params.mentorId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return respond({
        mentorId: params.mentorId,
        systemPrompt: data?.system_prompt ?? null
      });
    }

    if (req.method === "POST") {
      const payload = createMentorOverrideSchema.parse(await req.json());
      const trimmedPrompt = payload.systemPrompt.trim();
      const { data, error } = await supabaseClient
        .from("mentor_overrides")
        .upsert(
          {
            user_id: payload.userId,
            mentor_id: payload.mentorId,
            system_prompt: trimmedPrompt,
            updated_at: new Date().toISOString()
          },
          { onConflict: "user_id,mentor_id" },
        )
        .select("mentor_id, system_prompt")
        .single();

      if (error) {
        throw error;
      }

      return respond({
        mentorId: data?.mentor_id ?? payload.mentorId,
        systemPrompt: data?.system_prompt ?? trimmedPrompt
      });
    }

    if (req.method === "DELETE") {
      const payload = mentorOverrideQuerySchema.parse(await req.json());

      const { error } = await supabaseClient
        .from("mentor_overrides")
        .delete()
        .eq("user_id", payload.userId)
        .eq("mentor_id", payload.mentorId);

      if (error) {
        throw error;
      }

      return respond({ mentorId: payload.mentorId, systemPrompt: null });
    }

    return respond({ error: true, message: "Method not allowed" }, 405);
  } catch (error) {
    console.error("[mentor-overrides] error", error);

    if (error instanceof z.ZodError) {
      const details = error.flatten();
      return respond({ error: true, message: "Invalid payload", details }, 400);
    }

    const message = error instanceof Error ? error.message : "Unexpected error";
    return respond({ error: true, message }, 500);
  }
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
