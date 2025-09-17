import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    canvas_user_id: v.number(),
    name: v.string(),
    avatar_url: v.string(),
  }).index("by_canvas_user_id", ["canvas_user_id"]),

  discussions: defineTable({
    canvas_discussion_id: v.number(),
    title: v.string(),
    due_at: v.optional(v.string()),
  }).index("by_canvas_discussion_id", ["canvas_discussion_id"]),

  posts: defineTable({
    canvas_post_id: v.number(),
    author_id: v.id("users"),
    discussion_id: v.id("discussions"),
    message: v.string(),
    created_at: v.string(),
  }).index("by_canvas_post_id", ["canvas_post_id"]),

  replies: defineTable({
    canvas_reply_id: v.number(),
    author_id: v.id("users"),
    post_id: v.id("posts"),
    message: v.string(),
    created_at: v.string(),
  }).index("by_canvas_reply_id", ["canvas_reply_id"]),
});
