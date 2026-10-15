import { z } from "zod";

export const FEEDBACK_COMMENT_MAX = 1000;

// One feedback per customer per seller: a like or dislike, a 1–5 star rating
// and/or a written review. At least one of the three is required.
export const feedbackSchema = z
  .object({
    sellerId: z.uuid(),
    reaction: z.enum(["like", "dislike"]).nullable(),
    rating: z.number().int().min(1).max(5).nullable(),
    comment: z
      .string()
      .trim()
      .max(FEEDBACK_COMMENT_MAX, `Keep your review under ${FEEDBACK_COMMENT_MAX} characters`)
      .transform((value) => value.replace(/<[^>]*>/g, "") || null),
  })
  .refine((value) => value.reaction || value.rating || value.comment, {
    message: "Like, rate or write a review first",
    path: ["comment"],
  });
export type FeedbackInput = z.input<typeof feedbackSchema>;
