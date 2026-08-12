import { z } from "zod";

import { MESSAGE_MAX_LENGTH } from "@/lib/constants/communication";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(MESSAGE_MAX_LENGTH, `Message must be ${MESSAGE_MAX_LENGTH} characters or less`),
});

export const startConversationSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
