import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { getConversation, handleChat } from './services/chatService';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  mentorId: z.string().optional(),
  sessionId: z.string().optional(),
  userId: z.string().optional()
});

const chatQuerySchema = z.object({
  conversationId: z.string(),
  userId: z.string().optional()
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/chat', async (req: Request, res: Response) => {
  const parsed = chatQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: 'Invalid query parameters',
      details: parsed.error.flatten()
    });
  }

  try {
    const conversation = await getConversation(parsed.data.conversationId, parsed.data.userId);
    res.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(404).json({
      error: true,
      message
    });
  }
});

app.post('/api/chat', async (req: Request, res: Response) => {
  const parsed = chatRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: true,
      message: 'Invalid request payload',
      details: parsed.error.flatten()
    });
  }

  try {
    const chatResponse = await handleChat(parsed.data);
    res.json(chatResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: true,
      message
    });
  }
});

const port = Number(process.env.PORT ?? 3000);

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });
}

export default app;
