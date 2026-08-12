"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CHAT_POLL_MS } from "@/lib/constants/communication";
import {
  pollMessagesAction,
  sendMessageAction,
} from "@/lib/profile/communication-actions";
import { createClient } from "@/lib/supabase/client";
import type { MessageRow } from "@/lib/services/messaging.service";
import { cn } from "@/lib/utils";

type ChatThreadProps = {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageRow[];
  otherName: string;
};

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  otherName,
}: ChatThreadProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const lastCreatedAt = useMemo(
    () => messages[messages.length - 1]?.CreatedAt ?? null,
    [messages],
  );

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;
    const merge = (incoming: MessageRow[]) => {
      if (!incoming.length || cancelled) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((item) => item.Id));
        const next = [...prev];
        for (const item of incoming) {
          if (!ids.has(item.Id)) next.push(item);
        }
        return next;
      });
    };

    const poll = async () => {
      try {
        const after =
          messages[messages.length - 1]?.CreatedAt ?? lastCreatedAt;
        const fresh = await pollMessagesAction(conversationId, after);
        merge(fresh);
      } catch {
        // ignore transient poll errors
      }
    };

    const timer = window.setInterval(poll, CHAT_POLL_MS);

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    try {
      const supabase = createClient();
      channel = supabase
        .channel(`amvs-conv-${conversationId}`)
        .on("broadcast", { event: "message" }, (payload) => {
          const message = payload.payload as MessageRow;
          if (message?.Id) merge([message]);
        })
        .subscribe();
    } catch {
      // polling remains active
    }

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (channel) {
        createClient().removeChannel(channel);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll uses latest last message inside interval
  }, [conversationId]);

  return (
    <div className="flex h-[min(70vh,640px)] flex-col overflow-hidden rounded-xl border border-border/70">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="font-heading text-lg font-semibold">{otherName}</p>
        <p className="text-xs text-muted-foreground">
          Live updates via realtime broadcast with polling fallback.
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/10 px-4 py-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Say hello to start the conversation.
          </p>
        ) : null}
        {messages.map((message) => {
          const mine = message.SenderUserId === currentUserId;
          return (
            <div
              key={message.Id}
              className={cn("flex", mine ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border border-border/70",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.Body}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {new Date(message.CreatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        ref={formRef}
        className="space-y-2 border-t border-border/60 p-3"
        action={(formData) => {
          startTransition(async () => {
            setError(null);
            const result = await sendMessageAction({}, formData);
            if (result.error) {
              setError(result.error);
              return;
            }
            formRef.current?.reset();
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="conversationId" value={conversationId} />
        <Textarea
          name="body"
          required
          maxLength={4000}
          placeholder={`Message ${otherName}`}
          className="min-h-20"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
