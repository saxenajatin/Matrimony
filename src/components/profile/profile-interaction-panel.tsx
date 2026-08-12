"use client";

import { useActionState, useState } from "react";
import { Flag, Heart, MessageCircle, ShieldBan, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REPORT_REASON_OPTIONS } from "@/lib/constants/interactions";
import { startConversationAction } from "@/lib/profile/communication-actions";
import {
  acceptInterestAction,
  blockUserAction,
  rejectInterestAction,
  reportUserAction,
  sendInterestAction,
  toggleShortlistAction,
  withdrawInterestAction,
  type InteractionActionState,
} from "@/lib/profile/interaction-actions";
import type { InteractionState } from "@/lib/services/interaction.service";

type ProfileInteractionPanelProps = {
  profileId: string;
  targetUserId: string;
  displayName: string;
  state: InteractionState;
};

const initial: InteractionActionState = {};

export function ProfileInteractionPanel({
  profileId,
  targetUserId,
  displayName,
  state,
}: ProfileInteractionPanelProps) {
  const [showInterestForm, setShowInterestForm] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);

  const [interestState, interestAction, interestPending] = useActionState(
    sendInterestAction,
    initial,
  );
  const [reportState, reportAction, reportPending] = useActionState(
    reportUserAction,
    initial,
  );
  const [blockState, blockAction, blockPending] = useActionState(
    blockUserAction,
    initial,
  );

  if (state.isSelf) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        This is your profile.
      </div>
    );
  }

  if (state.blockedByMe) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        You blocked this member. Manage blocks in Settings.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/10 p-4">
      <div className="flex flex-wrap gap-2">
        {state.canMessage ? (
          <form action={startConversationAction.bind(null, targetUserId)}>
            <Button type="submit" size="sm" variant="secondary">
              <MessageCircle className="size-4" />
              Message
            </Button>
          </form>
        ) : null}

        {state.canSendInterest ? (
          <Button
            type="button"
            size="sm"
            onClick={() => setShowInterestForm((v) => !v)}
          >
            <Heart className="size-4" />
            Send interest
          </Button>
        ) : null}

        {state.outgoingInterest?.Status === "pending" ? (
          <form
            action={async () => {
              await withdrawInterestAction(state.outgoingInterest!.Id, profileId);
            }}
          >
            <Button type="submit" size="sm" variant="outline">
              Withdraw interest
            </Button>
          </form>
        ) : null}

        {state.outgoingInterest?.Status === "accepted" ||
        state.incomingInterest?.Status === "accepted" ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Connected
          </Button>
        ) : null}

        {state.outgoingInterest?.Status === "pending" ? (
          <Button type="button" size="sm" variant="secondary" disabled>
            Interest pending
          </Button>
        ) : null}

        {state.canAcceptInterest && state.incomingInterest ? (
          <>
            <form
              action={async () => {
                await acceptInterestAction(state.incomingInterest!.Id, profileId);
              }}
            >
              <Button type="submit" size="sm">
                Accept interest
              </Button>
            </form>
            <form
              action={async () => {
                await rejectInterestAction(state.incomingInterest!.Id, profileId);
              }}
            >
              <Button type="submit" size="sm" variant="outline">
                Decline
              </Button>
            </form>
          </>
        ) : null}

        <form
          action={async () => {
            await toggleShortlistAction(
              targetUserId,
              state.shortlisted,
              profileId,
            );
          }}
        >
          <Button type="submit" size="sm" variant="outline">
            <Star className="size-4" />
            {state.shortlisted ? "Remove shortlist" : "Shortlist"}
          </Button>
        </form>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setShowBlockConfirm((v) => !v)}
        >
          <ShieldBan className="size-4" />
          Block
        </Button>

        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setShowReportForm((v) => !v)}
        >
          <Flag className="size-4" />
          Report
        </Button>
      </div>

      {showInterestForm ? (
        <form action={interestAction} className="space-y-3 border-t border-border/60 pt-3">
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <input type="hidden" name="profileId" value={profileId} />
          <div className="space-y-1.5">
            <Label htmlFor="interest-message">Message (optional)</Label>
            <Textarea
              id="interest-message"
              name="message"
              placeholder={`A short note to ${displayName}`}
              maxLength={500}
            />
          </div>
          {interestState.error ? (
            <p className="text-sm text-destructive">{interestState.error}</p>
          ) : null}
          {interestState.success ? (
            <p className="text-sm text-primary">{interestState.success}</p>
          ) : null}
          <Button type="submit" size="sm" disabled={interestPending}>
            {interestPending ? "Sending..." : "Confirm interest"}
          </Button>
        </form>
      ) : null}

      {showBlockConfirm ? (
        <form action={blockAction} className="space-y-3 border-t border-border/60 pt-3">
          <input type="hidden" name="targetUserId" value={targetUserId} />
          <p className="text-sm text-muted-foreground">
            Blocking hides both profiles from each other and withdraws pending
            interests.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">Reason (optional)</Label>
            <Textarea id="block-reason" name="reason" maxLength={300} />
          </div>
          {blockState.error ? (
            <p className="text-sm text-destructive">{blockState.error}</p>
          ) : null}
          <Button type="submit" size="sm" variant="destructive" disabled={blockPending}>
            {blockPending ? "Blocking..." : "Confirm block"}
          </Button>
        </form>
      ) : null}

      {showReportForm ? (
        <form action={reportAction} className="space-y-3 border-t border-border/60 pt-3">
          <input type="hidden" name="reportedUserId" value={targetUserId} />
          <div className="space-y-1.5">
            <Label htmlFor="reasonCode">Reason</Label>
            <select
              id="reasonCode"
              name="reasonCode"
              required
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select a reason
              </option>
              {REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea id="report-details" name="details" maxLength={1000} />
          </div>
          {reportState.error ? (
            <p className="text-sm text-destructive">{reportState.error}</p>
          ) : null}
          {reportState.success ? (
            <p className="text-sm text-primary">{reportState.success}</p>
          ) : null}
          <Button type="submit" size="sm" disabled={reportPending}>
            {reportPending ? "Submitting..." : "Submit report"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
