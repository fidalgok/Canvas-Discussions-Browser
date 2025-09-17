# PRD: Discussion Thread Claiming & Completion Status

**Objective:** Allow facilitators to claim a discussion thread and mark it as "completed" to coordinate feedback efforts in real-time.

## 1. Problem Statement

Facilitators need a way to see which student discussion threads are currently being reviewed and which ones have already been handled. This prevents duplication of effort and provides a clear overview of the feedback workflow.

## 2. Revised Solution

We will create a new data model in Convex to store the status of each discussion thread. This model will "shadow" the discussion data coming from Canvas, linking the status to a specific thread without interfering with the existing data sync process. The UI will display the status in real-time and provide buttons for facilitators to update it.

### Key Components:

*   **New Convex Table:** A new table, `thread_statuses`, will be created to store the status information.
*   **Convex Schema:** The `thread_statuses` table will have fields for `status`, `facilitatorName`, and `statusUpdatedAt`.
*   **UI Modifications:** The discussion thread component will be updated to display the status and provide buttons to "Claim" and "Mark as Complete".
*   **Convex Mutations:** New mutations will be created to set and clear the status of a thread.

## 3. Implementation Plan

### Step 1: Create New Convex Table (`convex/schema.ts`)

We will define a new table called `thread_statuses`. This table will store the status for each discussion thread, linked by the thread's ID from Canvas.

```typescript
// in defineSchema

  thread_statuses: defineTable({
    threadId: v.string(), // The ID of the discussion thread from Canvas
    status: v.optional(v.union(v.literal("claimed"), v.literal("completed"))),
    facilitatorName: v.optional(v.string()),
    statusUpdatedAt: v.optional(v.number()),
  }).index("by_threadId", ["threadId"]),
```

This schema creates a `thread_statuses` table and adds an index on `threadId` for efficient lookups.

### Step 2: Create Convex Mutations (`convex/canvas.ts`)

We will create a single, versatile mutation to manage the status.

**`setThreadStatus({ threadId, status, facilitatorName })`**

*   **Purpose:** To set, change, or clear the status of a discussion thread.
*   **Arguments:**
    *   `threadId`: The ID of the discussion thread.
    *   `status`: The new status ("claimed", "completed", or `null` to clear).
    *   `facilitatorName`: The name of the facilitator making the change.
*   **Logic:**
    1.  Find the existing status document for the given `threadId`.
    2.  If a document exists, update it with the new `status`, `facilitatorName`, and the current timestamp.
    3.  If no document exists, create a new one with the provided information.
    4.  If the `status` argument is `null`, it should clear the status fields or delete the document.

### Step 3: Modify the Frontend

We will need to update the component that renders discussion threads (e.g., `components/discussion/TopicCard.js`).

*   **Fetch Status Data:** The component will need to query the `thread_statuses` table using the `useQuery` hook from Convex, passing in the `threadId`.
*   **Display Status:**
    *   If the status is "claimed", show: "Claimed by [Facilitator Name]".
    *   If the status is "completed", show: "Completed by [Facilitator Name]".
*   **"Claim" Button:**
    *   If the thread has no status, show a "Claim" button.
    *   Clicking it will call the `setThreadStatus` mutation with `status: "claimed"`.
*   **"Mark as Complete" Button:**
    *   If the thread is "claimed" by the *current user*, show a "Mark as Complete" button.
    *   Clicking it will call the `setThreadStatus` mutation with `status: "completed"`.
*   **"Clear Status" Button:**
    *   We should also provide a way to clear the status (e.g., an "Unclaim" or "Reset" button), which would call the mutation with `status: null`.

## 4. Pair Programming Workflow

We will follow the pair programming model as discussed. I will guide you through each step, and you will implement the code.

**Next Step:** If you approve this revised plan, we can proceed with Step 1: updating `convex/schema.ts` to create the new `thread_statuses` table.