// convex/canvas.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getDiscussions = query({
  handler: async (ctx) => {
    return await ctx.db.query("discussions").collect();
  },
});

export const syncDiscussions = mutation({
  args: {
    apiKey: v.string(),
    apiUrl: v.string(),
    courseId: v.string(),
  },
  handler: async (ctx, { apiUrl, apiKey, courseId }) => {
    console.log("syncDiscussions called with:", { courseId });

    // Step 1: Fetch all discussion topics for the course
    const topicsUrl = `${apiUrl}/courses/${courseId}/discussion_topics`;
    const topicsResponse = await fetch(topicsUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!topicsResponse.ok) {
      throw new Error(
        `Failed to fetch discussion topics: ${await topicsResponse.text()}`
      );
    }
    const topics = await topicsResponse.json();
    console.log(`Found ${topics.length} discussion topics`);

    // Step 2: Fetch all discussion entries and replies for each topic
    const seenPosts = new Set();
    const seenUsers = new Set();

    for (const topic of topics) {
      console.log(`Processing topic "${topic.title}" (ID: ${topic.id})`);

      // Store or update discussion topic
      let discussion = await ctx.db
        .query("discussions")
        .withIndex("by_canvas_discussion_id", (q) =>
          q.eq("canvas_discussion_id", topic.id)
        )
        .first();

      if (!discussion) {
        await ctx.db.insert("discussions", {
          canvas_discussion_id: topic.id,
          title: topic.title,
          due_at: topic.due_at,
        });
      }
      const discussionId = (
        await ctx.db
          .query("discussions")
          .withIndex("by_canvas_discussion_id", (q) =>
            q.eq("canvas_discussion_id", topic.id)
          )
          .first()
      )._id;

      // Fetch all top-level entries for this topic with full pagination
      let allEntries = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const entriesUrl = `${apiUrl}/courses/${courseId}/discussion_topics/${topic.id}/entries?per_page=100&page=${page}&include[]=recent_replies`;
        const entriesResponse = await fetch(entriesUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!entriesResponse.ok) {
          console.error(
            `Failed to fetch entries for topic ${topic.id}: ${await entriesResponse.text()}`
          );
          break;
        }
        const entries = await entriesResponse.json();
        allEntries = allEntries.concat(entries);
        hasMore = entries.length === 100;
        page++;
      }

      for (const entry of allEntries) {
        if (seenPosts.has(entry.id)) continue;
        seenPosts.add(entry.id);

        // Store user
        let user = await ctx.db
          .query("users")
          .withIndex("by_canvas_user_id", (q) =>
            q.eq("canvas_user_id", entry.user_id)
          )
          .first();
        if (!user && entry.user_id && !seenUsers.has(entry.user_id)) {
          seenUsers.add(entry.user_id);
          const userUrl = `${apiUrl}/users/${entry.user_id}`;
          const userResponse = await fetch(userUrl, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (userResponse.ok) {
            const user_details = await userResponse.json();
            await ctx.db.insert("users", {
              canvas_user_id: user_details.id,
              name: user_details.name,
              avatar_url: user_details.avatar_url,
            });
          }
        }
        const userId = (
          await ctx.db
            .query("users")
            .withIndex("by_canvas_user_id", (q) =>
              q.eq("canvas_user_id", entry.user_id)
            )
            .first()
        )?._id;

        // Store post
        let post = await ctx.db
          .query("posts")
          .withIndex("by_canvas_post_id", (q) =>
            q.eq("canvas_post_id", entry.id)
          )
          .first();

        if (!post && userId) {
          await ctx.db.insert("posts", {
            canvas_post_id: entry.id,
            author_id: userId,
            discussion_id: discussionId,
            message: entry.message,
            created_at: entry.created_at,
          });
        }
        const postId = (
          await ctx.db
            .query("posts")
            .withIndex("by_canvas_post_id", (q) =>
              q.eq("canvas_post_id", entry.id)
            )
            .first()
        )?._id;

        // Process replies
        const replies = entry.recent_replies || [];
        for (const reply of replies) {
          if (seenPosts.has(reply.id)) continue;
          seenPosts.add(reply.id);

          // Store user from reply
          let replyUser = await ctx.db
            .query("users")
            .withIndex("by_canvas_user_id", (q) =>
              q.eq("canvas_user_id", reply.user_id)
            )
            .first();
          if (!replyUser && reply.user_id && !seenUsers.has(reply.user_id)) {
            seenUsers.add(reply.user_id);
            const replyUserUrl = `${apiUrl}/users/${reply.user_id}`;
            const replyUserResponse = await fetch(replyUserUrl, {
              headers: { Authorization: `Bearer ${apiKey}` },
            });
            if (replyUserResponse.ok) {
              const reply_user_details = await replyUserResponse.json();
              await ctx.db.insert("users", {
                canvas_user_id: reply_user_details.id,
                name: reply_user_details.name,
                avatar_url: reply_user_details.avatar_url,
              });
            }
          }
          const replyUserId = (
            await ctx.db
              .query("users")
              .withIndex("by_canvas_user_id", (q) =>
                q.eq("canvas_user_id", reply.user_id)
              )
              .first()
          )?._id;

          // Store reply
          let convexReply = await ctx.db
            .query("replies")
            .withIndex("by_canvas_reply_id", (q) =>
              q.eq("canvas_reply_id", reply.id)
            )
            .first();

          if (!convexReply && replyUserId && postId) {
            await ctx.db.insert("replies", {
              canvas_reply_id: reply.id,
              author_id: replyUserId,
              post_id: postId,
              message: reply.message,
              created_at: reply.created_at,
            });
          }
        }
      }
    }
    console.log("Sync complete.");
  },
});

// sets of clears the status of a discussion thread

export const setThreadStatus = mutation({
  args: {
    threadId: v.string(),
    status: v.union(v.literal("claimed"), v.literal("completed"), v.null()),
    facilitatorName: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { threadId, status, facilitatorName } = args;
    const existingStatus = await ctx.db
      .query("thread_statuses")
      .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
      .first();

    // if the status is being cleared set to undefined
    if (!status) {
      if (existingStatus) {
        await ctx.db.delete(existingStatus._id);
      }
      return;
    }
    // patch existing status
    if (existingStatus) {
      await ctx.db.patch(existingStatus._id, {
        status,
        facilitatorName: facilitatorName || existingStatus.facilitatorName,
        statusUpdatedAt: Date.now(),
      });
      return;
    }
    // create new status
    await ctx.db.insert("thread_statuses", {
      threadId,
      status,
      facilitatorName,
      statusUpdatedAt: Date.now(),
    });
  },
});

// get the thread status
export const getThreadStatus = query({
  args: {
    threadId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("thread_statuses")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .first();
  },
});
