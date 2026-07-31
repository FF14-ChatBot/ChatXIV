import type { SourceCitation } from '@chatxiv/cdm';
import type { Message } from '../../types/chat';

/**
 * Abstraction for obtaining assistant text after a user message. The UI depends on this port,
 * not on HTTP details — swap `createDemoChatAssistantPort` for an implementation that calls
 * `chatxivApiRequest` (or streams) when the backend contract is ready.
 */
export type AssistantReply = {
  readonly text: string;
  readonly sources?: readonly SourceCitation[];
};

export interface ChatAssistantPort {
  /** `history` is prior turns only (not including `userMessage`) — pass `[]` if unsupported. */
  getReply(
    userMessage: string,
    history: readonly Message[],
    signal?: AbortSignal
  ): Promise<AssistantReply>;
}

export const DEMO_ASSISTANT_REPLY =
  "I'm MammetBot! This is a demo response. In a real implementation, I would provide helpful information about FFXIV!";

export const DEMO_ASSISTANT_SOURCES: readonly SourceCitation[] = [
  {
    sourceName: 'The Lodestone (Official)',
    sourceUrl: 'https://na.finalfantasyxiv.com/lodestone/',
    patchOrDate: 'Patch 7.1',
  },
  {
    sourceName: 'XIVAPI Item Database',
  },
];

export function createDemoChatAssistantPort(delayMs = 1000): ChatAssistantPort {
  return {
    getReply(_userMessage, _history, signal) {
      return new Promise((resolve, reject) => {
        const id = window.setTimeout(() => {
          resolve({ text: DEMO_ASSISTANT_REPLY, sources: DEMO_ASSISTANT_SOURCES });
        }, delayMs);

        const onAbort = () => {
          window.clearTimeout(id);
          reject(new DOMException('Aborted', 'AbortError'));
        };

        if (signal) {
          if (signal.aborted) {
            onAbort();
            return;
          }
          signal.addEventListener('abort', onAbort, { once: true });
        }
      });
    },
  };
}
