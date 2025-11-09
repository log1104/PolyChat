# Mentor Settings

This panel drives how each mentor behaves across persona, runtime controls, and tool usage. The UI currently exposes only the persona prompt, but the other tabs are placeholders that will matter once the config API is ready.

## Tabs

- **Persona**
  - The mentor’s system prompt (tone, expertise, guardrails).
  - Any change should persist to the shared mentor config store (Supabase table or versioned JSON).
  - Future work: draft/publish workflow so edits aren’t live until reviewed.

- **Runtime**
  - Planned knobs (per mentor):
    - Response timeout (ms) before aborting the LLM call.
    - Max tokens per reply.
    - Retry count / backoff strategy.
    - Rate-limit hints (window + max requests).
    - Streaming vs buffered response preference.
  - Enables mentors that need longer context or more cautious rate limits.
  - Requires schema support plus validation to prevent extreme values.

- **Tools**
  - Lists optional integrations (Stockfish, finance APIs, Bible lookup, etc.).
  - Eventually allows enabling/disabling per mentor, configuring API keys, and showing status.
  - For now, keep information-only until the tool runtime is wired up.

## Model selection

Mentor-specific models were initially considered, but we instead rely on the global model dropdown in the chat header. That keeps model choice simple and visible to users. If a mentor ever needs a hard model requirement, we can revisit per-mentor overrides, but they are not on the roadmap today.
