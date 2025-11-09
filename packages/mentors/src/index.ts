import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  mentorConfigCoreSchema,
  mentorConfigEnvelopeSchema,
  normalizeLegacyConfig,
  type MentorConfigCore,
} from "./schema";

const registrySchema = z.object({
  mentors: z.array(
    z.object({
      id: z.string(),
      promptFile: z.string(),
      keywords: z.array(z.string()),
    }),
  ),
});

export type MentorRegistry = z.infer<typeof registrySchema>;
export type MentorConfig = MentorConfigCore;

export function loadMentorRegistry(
  baseDir = path.resolve(process.cwd(), "config", "mentors"),
): MentorRegistry {
  const registryPath = path.join(baseDir, "index.json");
  const data = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  return registrySchema.parse(data);
}

export function loadMentorDefinition(
  mentorId: string,
  baseDir = path.resolve(process.cwd(), "config", "mentors"),
): MentorConfigCore {
  const registry = loadMentorRegistry(baseDir);
  const entry = registry.mentors.find((item) => item.id === mentorId);

  if (!entry) {
    throw new Error(`Mentor definition not found for id: ${mentorId}`);
  }

  const promptPath = path.join(baseDir, entry.promptFile);
  const data = JSON.parse(fs.readFileSync(promptPath, "utf8"));

  // Accept legacy files and normalize to new core schema
  const candidate = "systemPrompt" in data ? normalizeLegacyConfig(data) : data;
  return mentorConfigCoreSchema.parse(candidate);
}

// Convenience to shape an empty envelope from disk data
export function toEnvelope(config: MentorConfigCore) {
  return mentorConfigEnvelopeSchema.parse({
    id: config.id,
    draft: config,
    published: config,
  });
}
