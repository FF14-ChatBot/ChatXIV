import { ConversationRole } from '@chatxiv/cdm';
import type { SourceCitation } from '@chatxiv/cdm';

export interface Message {
  id: string;
  text: string;
  role: ConversationRole;
  sources?: readonly SourceCitation[];
}
