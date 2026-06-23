import { Router, type Request, type Response, type NextFunction } from 'express';
import { ChatRoute } from '@chatxiv/cdm';
import type { ChatRequestBody } from '@chatxiv/cdm';
import type { ChatService } from '../../lib/chat/types.js';
import { AppError } from '../../lib/errors/AppError.js';
import { requestContext } from '../../lib/request/requestContext.js';
import { assertChatUserMessageWithinLimit } from '../../lib/validation/chatUserMessage.js';
import { logger } from '../../lib/observability/logger.js';

export function createChatRouter(chatService: ChatService): Router {
  const router = Router();

  router.post(ChatRoute.Segment, (req: Request, res: Response, next: NextFunction): void => {
    handleChatJson(req, res, chatService).catch(next);
  });

  router.post(ChatRoute.StreamSegment, (req: Request, res: Response, next: NextFunction): void => {
    handleChatStream(req, res, chatService).catch(next);
  });

  return router;
}

function validateChatBody(body: unknown, requestId?: string): ChatRequestBody {
  if (!body || typeof body !== 'object') {
    throw AppError.validation('Request body is required', requestId);
  }

  const { message, sessionId, language, conversationHistory } = body as Record<string, unknown>;

  if (typeof message !== 'string' || message.trim().length === 0) {
    throw AppError.validation('message is required and must be a non-empty string', requestId);
  }

  assertChatUserMessageWithinLimit(message, requestId);

  if (sessionId !== undefined && typeof sessionId !== 'string') {
    throw AppError.validation('sessionId must be a string', requestId);
  }

  if (language !== undefined && typeof language !== 'string') {
    throw AppError.validation('language must be a string', requestId);
  }

  if (conversationHistory !== undefined && !Array.isArray(conversationHistory)) {
    throw AppError.validation('conversationHistory must be an array', requestId);
  }

  return {
    message: message.trim(),
    sessionId: sessionId as string | undefined,
    language: language as string | undefined,
    conversationHistory: conversationHistory as ChatRequestBody['conversationHistory'],
  };
}

/**
 * Non-streaming chat handler: runs the full classify → retrieve → generate pipeline and returns
 * one JSON body (`ChatResponseBody`). Prefer this for simple clients or tooling that does not
 * consume SSE; the UI can use {@link handleChatStream} for lower time-to-first-token.
 */
async function handleChatJson(
  req: Request,
  res: Response,
  chatService: ChatService
): Promise<void> {
  const requestId = requestContext.get()?.requestId;
  const chatRequest = validateChatBody(req.body, requestId);

  logger.info({ requestId, messageLength: chatRequest.message.length }, 'Chat request received');

  const response = await chatService.handleMessage(chatRequest);
  res.json(response);
}

/**
 * Streaming chat handler: writes Server-Sent Events (`text/event-stream`) so the client can
 * render tokens as they arrive. Each SSE message is one JSON `ChatStreamEvent` from CDM, framed
 * as `data: <json>`, blank line, repeat. Keeps the connection open until the service stream ends
 * or the client disconnects; on unexpected errors, writes a final `error`-typed event when possible
 * before closing.
 */
async function handleChatStream(
  req: Request,
  res: Response,
  chatService: ChatService
): Promise<void> {
  const requestId = requestContext.get()?.requestId;
  const chatRequest = validateChatBody(req.body, requestId);

  logger.info(
    { requestId, messageLength: chatRequest.message.length },
    'Chat stream request received'
  );

  try {
    for await (const event of chatService.handleMessageStream(chatRequest)) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
      }
      if (res.destroyed) break;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (err) {
    if (!res.headersSent) {
      throw err;
    }
    logger.error({ err, requestId }, 'SSE stream error');
    if (!res.destroyed) {
      const errorEvent = {
        type: 'error' as const,
        messageId: 'unknown',
        error: 'An unexpected error occurred during streaming. Please try again.',
      };
      res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    }
  } finally {
    if (res.headersSent && !res.destroyed) {
      res.end();
    }
  }
}
