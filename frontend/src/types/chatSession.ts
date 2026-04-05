/** After a session reset: marketing welcome vs. thread UI with an opening bot line. */
export const ChatSessionLanding = {
  Welcome: 'welcome',
  Thread: 'thread',
} as const;
export type ChatSessionLanding = (typeof ChatSessionLanding)[keyof typeof ChatSessionLanding];
