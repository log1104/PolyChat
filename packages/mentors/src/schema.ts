import { z } from "zod";

// Persona schema — core of mentor configuration
export const personaSchema = z.object({
  system_prompt: z.string().min(1, "system_prompt is required"),
  style_guidelines: z.array(z.string()).default([]),
  variables: z
    .record(
      z.object({
        label: z.string().optional(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        default: z.any().optional(),
        example: z.any().optional(),
        constraints: z
          .object({
            regex: z.string().optional(),
            maxLength: z.number().int().positive().optional(),
          })
          .optional(),
      }),
    )
    .default({}),
  response_format: z
    .enum(["plain", "markdown", "json", "html"])
    .default("markdown"),
  output_schema: z.record(z.any()).optional(),
  language: z.string().optional(),
  starter_prompts: z.array(z.string()).optional(),
  example_messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
  knowledge_cutoff: z.string().optional(), // ISO date string
  citation_policy: z
    .enum(["required", "encouraged", "optional", "never"])
    .optional(),
  disclaimer: z.string().optional(),
  safety_rules: z
    .object({
      allow: z.array(z.string()).optional(),
      deny: z.array(z.string()).optional(),
      escalation: z.string().optional(),
    })
    .optional(),
});

// Model + runtime schema
export const modelSchema = z.object({
  provider: z.string().default("openrouter"),
  model_id: z.string().default("openai/gpt-4o-mini"),
  params: z
    .object({
      temperature: z.number().min(0).max(2).default(0.7),
      top_p: z.number().min(0).max(1).default(1),
      max_tokens: z.number().int().positive().optional(),
      frequency_penalty: z.number().min(-2).max(2).default(0),
      presence_penalty: z.number().min(-2).max(2).default(0),
    })
    .default({}),
});

export const runtimeSchema = z.object({
  timeout_ms: z.number().int().positive().default(20000),
  retries: z.number().int().min(0).default(2),
  rate_limit_hint: z
    .object({ window_seconds: z.number().int().positive(), max_requests: z.number().int().min(1) })
    .optional(),
});

export const toolConfigSchema = z.object({
  id: z.string(),
  enabled: z.boolean().default(false),
  config: z.record(z.any()).default({}),
  dependencies: z.array(z.string()).default([]),
});

export const toolsSchema = z.object({
  items: z.array(toolConfigSchema).default([]),
});

export const mentorConfigCoreSchema = z.object({
  id: z.string(),
  persona: personaSchema,
  model: modelSchema.default({ provider: "openrouter", model_id: "openai/gpt-4o-mini" }),
  runtime: runtimeSchema.default({ timeout_ms: 20000, retries: 2 }),
  tools: toolsSchema.default({ items: [] }),
  metadata: z
    .object({
      version: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    })
    .default({}),
});

// Draft/Published wrapper for persistence
export const mentorConfigEnvelopeSchema = z.object({
  id: z.string(),
  draft: mentorConfigCoreSchema,
  published: mentorConfigCoreSchema.optional(),
  updated_at: z.string().optional(),
  updated_by: z.string().uuid().optional(),
});

export type Persona = z.infer<typeof personaSchema>;
export type MentorConfigCore = z.infer<typeof mentorConfigCoreSchema>;
export type MentorConfigEnvelope = z.infer<typeof mentorConfigEnvelopeSchema>;

// Back-compat loader: map legacy JSON files to the new shape.
export function normalizeLegacyConfig(legacy: any): MentorConfigCore {
  // Legacy shape: { id, systemPrompt, styleGuidelines, tooling: { tools[], fallback } }
  const persona: Persona = {
    system_prompt: String(legacy.systemPrompt ?? ""),
    style_guidelines: Array.isArray(legacy.styleGuidelines)
      ? legacy.styleGuidelines.map(String)
      : [],
    variables: {},
    response_format: "markdown",
  };

  const tools = Array.isArray(legacy?.tooling?.tools)
    ? legacy.tooling.tools.map((t: any) => ({ id: String(t), enabled: true, config: {}, dependencies: [] }))
    : [];

  return mentorConfigCoreSchema.parse({
    id: String(legacy.id ?? "general"),
    persona,
    model: { provider: "openrouter", model_id: "openai/gpt-4o-mini" },
    runtime: { timeout_ms: 20000, retries: 2 },
    tools: { items: tools },
    metadata: {},
  });
}

