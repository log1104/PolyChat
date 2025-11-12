import cors from "cors";
import dotenv from "dotenv";
import path from "node:path";
import express, { type Request, type Response } from "express";
import { z } from "zod";
import {
  createConversation,
  getConversation,
  getConversationMessages,
  handleChat,
  listConversations,
  renameConversation,
} from "./services/chatService";
import {
  getMentorEnvelope,
  mentorIdParam,
  publishMentor,
  upsertDraft,
} from "./services/mentorConfigService";
import {
  addUserChatModel,
  listUserChatModels,
  removeUserChatModel,
} from "./services/chatModelService";
import { mentorConfigCoreSchema } from "./schema/mentorConfigSchema";

// Load env from multiple likely locations to support monorepo runs
const triedPaths: string[] = [];
const tryLoad = (p: string) => {
  triedPaths.push(p);
  dotenv.config({ path: p, override: false });
};
// 1) working dir (apps/api when run via pnpm filter)
tryLoad(path.resolve(process.cwd(), ".env"));
// 2) alongside compiled file (dist -> load ../.env)
tryLoad(path.resolve(__dirname, "../.env"));
// 3) monorepo root (dist is apps/api/dist -> ../../../.env)
tryLoad(path.resolve(__dirname, "../../../.env"));

const app = express();

app.use(cors());
app.use(express.json());

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  mentorId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

const chatQuerySchema = z.object({
  conversationId: z.string(),
  userId: z.string().optional(),
});

const listConversationsSchema = z.object({
  userId: z.string(),
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  offset: z.coerce.number().min(0).optional(),
});

const createConversationSchema = z.object({
  userId: z.string(),
  mentorId: z.string().optional(),
});

const renameConversationSchema = z.object({
  userId: z.string(),
  title: z.string().min(1).max(200),
});

const messagesQuerySchema = z.object({
  userId: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).optional(),
  before: z.string().datetime().optional(),
});

const chatModelsQuerySchema = z.object({
  userId: z.string().uuid(),
});

const createChatModelSchema = chatModelsQuerySchema.extend({
  modelId: z.string().trim().min(1, "Model ID is required"),
  label: z.string().trim().min(1, "Label is required"),
});

const deleteChatModelSchema = chatModelsQuerySchema.extend({
  modelId: z.string().trim().min(1, "Model ID is required"),
});

// Mentor Config schemas
const mentorDraftSchema = z.object({
  id: z.string(),
  persona: z.any(),
  model: z.any(),
  runtime: z.any(),
  tools: z.any(),
  metadata: z.any().optional(),
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/chat-models", async (req: Request, res: Response) => {
  const parsed = chatModelsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }
  try {
    const models = await listUserChatModels(parsed.data.userId);
    res.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

app.post("/api/chat-models", async (req: Request, res: Response) => {
  const parsed = createChatModelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid request payload",
      details: parsed.error.flatten(),
    });
  }
  try {
    const models = await addUserChatModel(
      parsed.data.userId,
      parsed.data.modelId,
      parsed.data.label,
    );
    res.status(201).json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

app.delete("/api/chat-models", async (req: Request, res: Response) => {
  const parsed = deleteChatModelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid request payload",
      details: parsed.error.flatten(),
    });
  }
  try {
    const models = await removeUserChatModel(
      parsed.data.userId,
      parsed.data.modelId,
    );
    res.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

// Mentor Config Endpoints (Stage 2 minimal)
app.get("/api/mentors/:id", async (req: Request, res: Response) => {
  const id = mentorIdParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: true, message: "Invalid mentor id" });
  try {
    const env = await getMentorEnvelope(id.data);
    if (!env) return res.status(404).json({ error: true, message: "Not found" });
    res.json(env);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

app.put("/api/mentors/:id/draft", async (req: Request, res: Response) => {
  const id = mentorIdParam.safeParse(req.params.id);
  const draft = mentorDraftSchema.safeParse(req.body);
  if (!id.success || !draft.success) {
    return res.status(400).json({ error: true, message: "Invalid payload" });
  }
  try {
    const env = await upsertDraft(
      id.data,
      mentorConfigCoreSchema.parse(draft.data),
      undefined,
    );
    res.json(env);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

app.post("/api/mentors/:id/publish", async (req: Request, res: Response) => {
  const id = mentorIdParam.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: true, message: "Invalid mentor id" });
  try {
    const env = await publishMentor(id.data);
    res.json(env);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

app.get("/api/chat", async (req: Request, res: Response) => {
  const parsed = chatQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }

  try {
    const conversation = await getConversation(
      parsed.data.conversationId,
      parsed.data.userId,
    );
    res.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({
      error: true,
      message,
    });
  }
});

app.post("/api/chat", async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid request payload",
      details: parsed.error.flatten(),
    });
  }

  try {
    const chatResponse = await handleChat(parsed.data);
    res.json(chatResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: true,
      message,
    });
  }
});

// Conversations listing
app.get("/api/conversations", async (req: Request, res: Response) => {
  const parsed = listConversationsSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid query parameters",
      details: parsed.error.flatten(),
    });
  }
  try {
    const list = await listConversations(
      parsed.data.userId,
      parsed.data.q,
      parsed.data.limit ?? 50,
      parsed.data.offset ?? 0,
    );
    res.json({ conversations: list });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

// Create a new conversation
app.post("/api/conversations", async (req: Request, res: Response) => {
  const parsed = createConversationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid request payload",
      details: parsed.error.flatten(),
    });
  }
  try {
    const conv = await createConversation(
      parsed.data.userId,
      parsed.data.mentorId,
    );
    res.status(201).json(conv);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

// Rename a conversation
app.patch("/api/conversations/:id", async (req: Request, res: Response) => {
  const body = renameConversationSchema.safeParse(req.body);
  const id = z.string().uuid().safeParse(req.params.id);
  if (!body.success || !id.success) {
    return res.status(400).json({
      error: true,
      message: "Invalid request",
      details: { body: body.success ? undefined : body.error.flatten() },
    });
  }
  try {
    const result = await renameConversation(
      id.data,
      body.data.userId,
      body.data.title,
    );
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: true, message });
  }
});

// Get paginated messages for a conversation
app.get(
  "/api/conversations/:id/messages",
  async (req: Request, res: Response) => {
    const id = z.string().uuid().safeParse(req.params.id);
    const parsed = messagesQuerySchema.safeParse(req.query);
    if (!id.success || !parsed.success) {
      return res.status(400).json({
        error: true,
        message: "Invalid request",
        details: { params: id.success ? undefined : id.error.flatten() },
      });
    }
    try {
      const items = await getConversationMessages(
        id.data,
        parsed.data.userId,
        parsed.data.limit ?? 50,
        parsed.data.before,
      );
      res.json({ messages: items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: true, message });
    }
  },
);

const port = Number(process.env.PORT ?? 3000);

// Start server only when executed directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`[api] listening on http://127.0.0.1:${port}`);
  });
}

export default app;
