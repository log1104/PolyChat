import fetch from 'node-fetch';
import { z } from 'zod';

const stockfishResponseSchema = z.object({
  bestmove: z.string(),
  lines: z
    .array(
      z.object({
        pv: z.string(),
        score: z.object({
          type: z.string(),
          value: z.number()
        })
      })
    )
    .optional(),
  metadata: z.record(z.any()).optional()
});

export type StockfishResponse = z.infer<typeof stockfishResponseSchema>;

export async function analyzeFenWithStockfish(fen: string, depth = 14, multiPv = 1): Promise<StockfishResponse> {
  const endpoint = process.env.STOCKFISH_API_URL;
  const apiKey = process.env.STOCKFISH_API_KEY;

  if (!endpoint) {
    throw new Error('Missing STOCKFISH_API_URL');
  }

  const response = await fetch(`${endpoint}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({ fen, depth, multiPv })
  });

  if (!response.ok) {
    throw new Error(`Stockfish service error: ${response.statusText}`);
  }

  const payload = await response.json();
  return stockfishResponseSchema.parse(payload);
}
