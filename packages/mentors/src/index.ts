import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const mentorSchema = z.object({
  id: z.string(),
  systemPrompt: z.string(),
  styleGuidelines: z.array(z.string()),
  tooling: z.object({
    tools: z.array(z.string()),
    fallback: z.string().nullable()
  })
});

const registrySchema = z.object({
  mentors: z.array(
    z.object({
      id: z.string(),
      promptFile: z.string(),
      keywords: z.array(z.string())
    })
  )
});

export type MentorDefinition = z.infer<typeof mentorSchema>;
export type MentorRegistry = z.infer<typeof registrySchema>;

export function loadMentorRegistry(baseDir = path.resolve(process.cwd(), 'config', 'mentors')): MentorRegistry {
  const registryPath = path.join(baseDir, 'index.json');
  const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  return registrySchema.parse(data);
}

export function loadMentorDefinition(mentorId: string, baseDir = path.resolve(process.cwd(), 'config', 'mentors')): MentorDefinition {
  const registry = loadMentorRegistry(baseDir);
  const entry = registry.mentors.find((item) => item.id === mentorId);

  if (!entry) {
    throw new Error(`Mentor definition not found for id: ${mentorId}`);
  }

  const promptPath = path.join(baseDir, entry.promptFile);
  const data = JSON.parse(fs.readFileSync(promptPath, 'utf8'));

  return mentorSchema.parse(data);
}
