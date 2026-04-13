import { API_V1_PREFIX } from './apiVersion.js';
import type { UsageCategory } from './usage.js';

/** Source citation for the UI Source dropdown. */
export interface SourceCitation {
  readonly sourceName: string;
  readonly sourceUrl?: string;
  readonly patchOrDate?: string;
  readonly lastUpdated?: string;
}

export const ConversationRole = {
  User: 'user',
  Assistant: 'assistant',
} as const;

export type ConversationRole = (typeof ConversationRole)[keyof typeof ConversationRole];

export interface ConversationTurn {
  readonly role: ConversationRole;
  readonly content: string;
}

/** Request body for `POST /v1/chat`. (non-streaming). */
export interface ChatRequestBody {
  readonly message: string;
  readonly sessionId?: string;
  readonly language?: string;
  readonly conversationHistory?: readonly ConversationTurn[];
}

/** JSON response for `POST /v1/chat` (non-streaming). */
export interface ChatResponseBody {
  readonly messageId: string;
  readonly answer: string;
  readonly sources: readonly SourceCitation[];
  readonly category?: UsageCategory;
}

/**
 * SSE event discriminator for `POST /v1/chat/stream`.
 * Each event is sent as `data: <JSON>\n\n`.
 */
export const ChatStreamEventType = {
  Token: 'token',
  Sources: 'sources',
  Done: 'done',
  Error: 'error',
} as const;

export type ChatStreamEventType = (typeof ChatStreamEventType)[keyof typeof ChatStreamEventType];

export interface ChatStreamEvent {
  readonly type: ChatStreamEventType;
  readonly messageId: string;
  readonly content?: string;
  readonly sources?: readonly SourceCitation[];
  readonly category?: UsageCategory;
  readonly error?: string;
}

/**
 * Paths relative to the `/v1` Express mount (`app.use('/v1', publicRouter)`).
 * Use these in nested routers; use `CHAT_PATH` / `CHAT_STREAM_PATH` for full URLs (frontend, OpenAPI).
 */
export const ChatRoute = {
  Segment: '/chat',
  StreamSegment: '/chat/stream',
} as const;

export type ChatRoute = (typeof ChatRoute)[keyof typeof ChatRoute];

export const CHAT_PATH = `${API_V1_PREFIX}${ChatRoute.Segment}` as const;
export const CHAT_STREAM_PATH = `${API_V1_PREFIX}${ChatRoute.StreamSegment}` as const;
