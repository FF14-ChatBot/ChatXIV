/**
 * Abstraction for obtaining assistant text after a user message. The UI depends on this port,
 * not on HTTP details — swap `createDemoChatAssistantPort` for an implementation that calls
 * `chatxivApiRequest` (or streams) when the backend contract is ready.
 */
export type AssistantReply = { readonly text: string };

export interface ChatAssistantPort {
  getReply(userMessage: string, signal?: AbortSignal): Promise<AssistantReply>;
}

export const DEMO_ASSISTANT_REPLY =
  "I'm MammetBot! This is a demo response. In a real implementation, I would provide helpful information about FFXIV!";

export function createDemoChatAssistantPort(delayMs = 1000): ChatAssistantPort {
  return {
    getReply(_userMessage, signal) {
      return new Promise((resolve, reject) => {
        const id = window.setTimeout(() => {
          resolve({ text: DEMO_ASSISTANT_REPLY });
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
