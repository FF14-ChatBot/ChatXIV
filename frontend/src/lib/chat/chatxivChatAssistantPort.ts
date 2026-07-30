import type { ConversationTurn } from '@chatxiv/cdm';
import { sendChatMessage } from '../../clients/chatxivApi/chat';
import type { Message } from '../../types/chat';
import type { ChatAssistantPort } from './chatAssistantPort';

function toConversationTurn(message: Message): ConversationTurn {
  return { role: message.role, content: message.text };
}

/** Real `ChatAssistantPort`: calls the backend `/v1/chat` (single JSON response, not streamed). */
export function createChatxivChatAssistantPort(): ChatAssistantPort {
  return {
    async getReply(userMessage, history, signal) {
      const response = await sendChatMessage(
        {
          message: userMessage,
          conversationHistory: history.map(toConversationTurn),
        },
        { signal }
      );
      return { text: response.answer, sources: response.sources };
    },
  };
}
