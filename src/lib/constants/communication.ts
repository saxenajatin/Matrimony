export const NOTIFICATION_TYPES = [
  "interest_received",
  "interest_accepted",
  "interest_rejected",
  "new_message",
  "profile_verification",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MESSAGE_MAX_LENGTH = 4000;
export const CHAT_POLL_MS = 4000;
export const CHAT_PAGE_SIZE = 50;
