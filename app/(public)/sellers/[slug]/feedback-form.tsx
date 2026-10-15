"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, StarIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { deleteMyFeedback, saveFeedback } from "@/lib/actions/feedback";
import { cn } from "@/lib/utils";
import { FEEDBACK_COMMENT_MAX } from "@/lib/validations/feedback";

type Reaction = "like" | "dislike";
export type MyFeedback = { reaction: Reaction | null; rating: number | null; comment: string | null };

// The signed-in customer's like/dislike, stars and review for this seller
export function FeedbackForm({
  sellerId,
  sellerName,
  existing,
}: {
  sellerId: string;
  sellerName: string;
  existing: MyFeedback | null;
}) {
  const [reaction, setReaction] = useState<Reaction | null>(existing?.reaction ?? null);
  const [rating, setRating] = useState<number | null>(existing?.rating ?? null);
  const [hover, setHover] = useState<number | null>(null);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const reduce = useReducedMotion();
  const [saving, startSave] = useTransition();
  const [removing, startRemove] = useTransition();
  const empty = !reaction && !rating && !comment.trim();

  function save() {
    startSave(async () => {
      const result = await saveFeedback({ sellerId, reaction, rating, comment });
      if (result.ok) toast.success(existing ? "Your feedback was updated." : "Thanks for your feedback!");
      else toast.error(result.fieldErrors?.comment?.[0] ?? result.error);
    });
  }

  function remove() {
    startRemove(async () => {
      const result = await deleteMyFeedback(sellerId);
      if (!result.ok) return void toast.error(result.error);
      setReaction(null);
      setRating(null);
      setComment("");
      toast.success("Your feedback was removed.");
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <h3 className="font-heading font-semibold">
        {existing ? "Your feedback" : `Rate ${sellerName}`}
      </h3>

      <div className="flex flex-wrap items-center gap-2">
        <ReactionButton
          active={reaction === "like"}
          onClick={() => setReaction(reaction === "like" ? null : "like")}
          label="Like"
          icon={<ThumbsUpIcon />}
          activeClass="border-success/60 bg-success/10 text-success"
        />
        <ReactionButton
          active={reaction === "dislike"}
          onClick={() => setReaction(reaction === "dislike" ? null : "dislike")}
          label="Dislike"
          icon={<ThumbsDownIcon />}
          activeClass="border-destructive/60 bg-destructive/10 text-destructive"
        />
        <div
          className="ml-1 flex items-center"
          role="radiogroup"
          aria-label="Rating"
          onMouseLeave={() => setHover(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const lit = (hover ?? rating ?? 0) >= star;
            return (
              <motion.button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} star${star === 1 ? "" : "s"}`}
                onClick={() => setRating(rating === star ? null : star)}
                onMouseEnter={() => setHover(star)}
                whileHover={reduce ? undefined : { scale: 1.2 }}
                whileTap={reduce ? undefined : { scale: 0.8 }}
                className="flex size-11 items-center justify-center"
              >
                {/* Re-keyed when the rating changes so the selected stars pop in sequence */}
                <motion.span
                  key={rating !== null && star <= rating ? `on-${rating}` : "off"}
                  initial={reduce || rating === null || star > rating ? false : { scale: 0.4, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 14, delay: (star - 1) * 0.04 }}
                >
                  <StarIcon
                    className={cn(
                      "size-7 transition-colors",
                      lit ? "fill-warning text-warning" : "text-muted-foreground/50"
                    )}
                  />
                </motion.span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={FEEDBACK_COMMENT_MAX}
          rows={3}
          placeholder="Share how buying from this seller went (optional)"
          aria-label="Your review"
        />
        <span className="self-end text-xs text-muted-foreground tabular-nums">
          {comment.length}/{FEEDBACK_COMMENT_MAX}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" className="h-11" disabled={saving || removing || empty} onClick={save}>
          {saving && <Loader2Icon className="animate-spin" />}
          {saving ? "Saving…" : existing ? "Update feedback" : "Post feedback"}
        </Button>
        {existing && (
          <Button size="lg" variant="ghost" className="h-11" disabled={saving || removing} onClick={remove}>
            {removing ? "Removing…" : "Remove"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReactionButton({
  active,
  onClick,
  label,
  icon,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
}) {
  const reduce = useReducedMotion();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-11 transition-colors active:scale-[0.97]", active && activeClass)}
    >
      {/* Pops and tilts when chosen */}
      <motion.span
        key={String(active)}
        className="inline-flex"
        initial={false}
        animate={active && !reduce ? { scale: [1, 1.5, 1], rotate: [0, -18, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {icon}
      </motion.span>{" "}
      {label}
    </Button>
  );
}
