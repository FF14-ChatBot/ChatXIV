import { vi, type Mocked } from 'vitest';
import type { ChatService } from '@src/lib/chat/types.js';

export function createMockChatService(): Mocked<ChatService> {
  return {
    handleMessage: vi.fn(),
    handleMessageStream: vi.fn(),
  };
}
