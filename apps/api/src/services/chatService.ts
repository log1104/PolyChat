import { randomUUID } from 'node:crypto';
import { supabase } from '../lib/supabase';

export interface ChatPayload {
  message: string;
  mentorId?: string;
  sessionId?: string;
  userId?: string;
}

export interface ChatResponse {
  conversationId: string;
  userId: string;
  mentorId: string;
  reply: string;
  history: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    createdAt: string;
  }>;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  mentorId: string;
  title: string | null;
  createdAt: string;
  preview?: string; // first few words of the first user message
}

const DEFAULT_ASSISTANT_REPLY_PREFIX =
  'This is a placeholder response until mentor intelligence is integrated. You said: ';

export async function handleChat(payload: ChatPayload): Promise<ChatResponse> {
  const mentorId = payload.mentorId ?? 'bible';

  const userId = await ensureUser(payload.userId);
  const conversationId = await ensureConversation(userId, mentorId, payload.sessionId);

  await insertMessage(conversationId, 'user', payload.message, mentorId);
  const assistantReply = `${DEFAULT_ASSISTANT_REPLY_PREFIX}${payload.message}`;
  await insertMessage(conversationId, 'assistant', assistantReply, mentorId);

  const history = await fetchConversationMessages(conversationId);

  return {
    conversationId,
    userId,
    mentorId,
    reply: assistantReply,
    history: history.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at
    }))
  };
}

export async function getConversation(conversationId: string, userId?: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, user_id, mentor, title, created_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  if (!data) {
    throw new Error('Conversation not found');
  }

  if (userId && data.user_id !== userId) {
    throw new Error('Conversation does not belong to the supplied user');
  }

  const history = await fetchConversationMessages(conversationId);

  return {
    conversationId: data.id as string,
    userId: data.user_id as string,
    mentorId: data.mentor as string,
    history: history.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at
    }))
  };
}

async function ensureUser(existingUserId?: string): Promise<string> {
  if (existingUserId) {
    return existingUserId;
  }

  const email = `guest-${randomUUID()}@polychat.local`;

  const { data, error } = await supabase
    .from('users')
    .insert({ email })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

async function ensureConversation(userId: string, mentorId: string, existingConversationId?: string): Promise<string> {
  if (existingConversationId) {
    return existingConversationId;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      mentor: mentorId,
      title: `Session started ${new Date().toLocaleString()}`
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

async function insertMessage(conversationId: string, role: 'user' | 'assistant', content: string, mentorId: string): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata: { mentor: mentorId }
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert ${role} message: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

async function fetchConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    throw new Error(`Failed to load conversation messages: ${error?.message ?? 'unknown error'}`);
  }

  return data;
}

// New: conversations listing and management
export async function listConversations(
  userId: string,
  q?: string,
  limit = 50,
  offset = 0
): Promise<ConversationSummary[]> {
  let query = supabase
    .from('conversations')
    .select('id, user_id, mentor, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (q && q.trim()) {
    query = query.ilike('title', `%${q}%`);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(`Failed to list conversations: ${error?.message ?? 'unknown error'}`);
  }

  // Attach a lightweight preview generated from the first user message
  const results: ConversationSummary[] = [];
  for (const row of data) {
    const id = row.id as string;
    let preview: string | undefined;
    try {
      const first = await fetchFirstUserMessage(id);
      if (first) preview = makePreview(first, 8);
    } catch {
      // non-fatal; leave preview undefined
    }
    results.push({
      id,
      userId: row.user_id as string,
      mentorId: row.mentor as string,
      title: (row as any).title ?? null,
      createdAt: (row as any).created_at as string,
      preview
    });
  }

  return results;
}

export async function createConversation(userId: string, mentorId = 'general'): Promise<ConversationSummary> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      mentor: mentorId,
      title: `New chat ${new Date().toLocaleString()}`
    })
    .select('id, user_id, mentor, title, created_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create conversation: ${error?.message ?? 'unknown error'}`);
  }

  return {
    id: data.id as string,
    userId: data.user_id as string,
    mentorId: data.mentor as string,
    title: (data as any).title ?? null,
    createdAt: (data as any).created_at as string,
    preview: undefined
  };
}

export async function renameConversation(conversationId: string, userId: string, title: string) {
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to rename conversation: ${error?.message ?? 'unknown error'}`);
  }

  return { id: data.id as string };
}

export async function getConversationMessages(
  conversationId: string,
  userId?: string,
  limit = 50,
  before?: string
) {
  // Validate conversation ownership when userId provided
  if (userId) {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('id, user_id')
      .eq('id', conversationId)
      .maybeSingle();
    if (convErr) throw new Error(`Failed to verify conversation: ${convErr.message}`);
    if (!conv) throw new Error('Conversation not found');
    if (conv.user_id !== userId) throw new Error('Forbidden');
  }

  let query = supabase
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error || !data) {
    throw new Error(`Failed to load messages: ${error?.message ?? 'unknown error'}`);
  }

  // Return ascending order for UI convenience
  return [...data].reverse().map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  }));
}

// Helpers
function makePreview(text: string, maxWords = 8): string {
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, maxWords).join(' ') + '…';
}

async function fetchFirstUserMessage(conversationId: string): Promise<string | undefined> {
  const { data, error } = await supabase
    .from('messages')
    .select('content, role, created_at')
    .eq('conversation_id', conversationId)
    .eq('role', 'user')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return undefined;
  return (data as { content?: string } | null)?.content ?? undefined;
}
