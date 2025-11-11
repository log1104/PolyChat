import { z } from "zod";
import { supabase } from "../lib/supabase";
import {
  mentorConfigCoreSchema,
  mentorConfigEnvelopeSchema,
  type MentorConfigCore,
  type MentorConfigEnvelope,
} from "../schema/mentorConfigSchema";

export const mentorIdParam = z.string().min(1);

export async function getMentorEnvelope(
  id: string,
): Promise<MentorConfigEnvelope | null> {
  const { data, error } = await supabase
    .from("mentor_configs")
    .select("id, draft, published, updated_at, updated_by")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mentorConfigEnvelopeSchema.parse(data);
}

export async function upsertDraft(
  id: string,
  draft: MentorConfigCore,
  updatedBy?: string,
): Promise<MentorConfigEnvelope> {
  const parsed = mentorConfigCoreSchema.parse(draft);
  const payload: {
    id: string;
    draft: MentorConfigCore;
    updated_by: string | null;
  } = { id, draft: parsed, updated_by: updatedBy ?? null };
  const { data, error } = await supabase
    .from("mentor_configs")
    .upsert(payload, { onConflict: "id" })
    .select("id, draft, published, updated_at, updated_by")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to upsert draft");
  return mentorConfigEnvelopeSchema.parse(data);
}

export async function publishMentor(
  id: string,
  updatedBy?: string,
): Promise<MentorConfigEnvelope> {
  const existing = await getMentorEnvelope(id);
  if (!existing) throw new Error("Mentor config not found");
  const { data, error } = await supabase
    .from("mentor_configs")
    .update({ published: existing.draft, updated_by: updatedBy ?? null })
    .eq("id", id)
    .select("id, draft, published, updated_at, updated_by")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to publish");
  return mentorConfigEnvelopeSchema.parse(data);
}
