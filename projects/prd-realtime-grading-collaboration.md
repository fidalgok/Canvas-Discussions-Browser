# PRD: Real-time Grading Collaboration with Convex

## Overview

Transform the Canvas Discussion Browser grading dashboard into a collaborative platform that enables multiple instructors to work efficiently without conflicts or duplicate effort. This enhancement adds real-time updates and student claiming functionality to prevent grading collisions in multi-instructor courses.

## Problem Statement

### Current Pain Points
- **Manual Refresh Required**: Instructors must manually refresh to see grading updates from colleagues
- **Duplicate Effort**: Multiple teachers may unknowingly grade the same student simultaneously
- **No Coordination**: No visibility into which students colleagues are currently working on
- **Stale Data**: Grading status can be outdated, leading to inefficient workflow
- **Conflict Resolution**: No mechanism to prevent or resolve grading conflicts

### Impact on Workflow
- **Time Waste**: Teachers duplicating effort on same students
- **Coordination Overhead**: Manual communication required to divide work
- **Inconsistent Experience**: Different teachers see different grading states
- **Delayed Feedback**: Students wait longer for grades due to coordination issues

## Solution

### 🔄 **Feature 1: Real-time Grade/Reply Updates**
Automatically sync grading status and new replies across all active instructor sessions without manual refresh.

### 👥 **Feature 2: Student Claiming System**
Allow instructors to "claim" students they're actively grading, with real-time conflict prevention and visual indicators.

## Success Metrics

### User Experience
- **Coordination Time**: 80% reduction in manual coordination between instructors
- **Duplicate Work**: Eliminate 95% of duplicate grading efforts
- **Response Time**: Real-time updates within 2-3 seconds of changes
- **User Adoption**: 90% of multi-instructor courses using claim system within 30 days

### Technical Performance
- **Update Latency**: < 3 seconds for grade/reply updates
- **Claim Conflicts**: < 1% collision rate after claim implementation
- **System Reliability**: 99.5% uptime for real-time features
- **Data Consistency**: 100% synchronization across instructor sessions

## Technical Architecture

### Real-time Infrastructure (Convex)

#### Database Schema
```typescript
// convex/schema.ts
export default defineSchema({
  // User sessions and presence
  instructorSessions: defineTable({
    userId: v.id("users"),
    courseId: v.string(),
    lastActive: v.number(),
    currentPage: v.string(), // "feedback", "user/{name}", etc.
    status: v.union(v.literal("active"), v.literal("away"), v.literal("offline")),
  }).index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"]),

  // Student claiming system  
  studentClaims: defineTable({
    studentId: v.string(),
    studentName: v.string(),
    courseId: v.string(),
    topicId: v.string(),
    claimedBy: v.id("users"),
    claimedByName: v.string(),
    claimedAt: v.number(),
    expiresAt: v.number(), // Auto-release after 30 minutes
    status: v.union(
      v.literal("claimed"), 
      v.literal("grading"), 
      v.literal("completed"),
      v.literal("released")
    ),
    notes: v.optional(v.string()),
  }).index("by_course", ["courseId"])
    .index("by_student", ["studentId", "courseId"])
    .index("by_claimer", ["claimedBy"]),

  // Canvas data sync tracking
  canvasSyncStatus: defineTable({
    courseId: v.string(),
    lastSyncAt: v.number(),
    nextSyncAt: v.number(),
    syncSource: v.union(v.literal("webhook"), v.literal("poll"), v.literal("manual")),
    changesDetected: v.number(),
    errors: v.optional(v.array(v.string())),
  }).index("by_course", ["courseId"]),

  // Grade change notifications
  gradeNotifications: defineTable({
    courseId: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    topicId: v.string(),
    topicTitle: v.string(),
    changeType: v.union(v.literal("graded"), v.literal("reply_added"), v.literal("submission_updated")),
    changedBy: v.optional(v.string()), // Teacher name
    timestamp: v.number(),
    acknowledged: v.array(v.id("users")), // Users who have seen this notification
  }).index("by_course", ["courseId"])
    .index("by_timestamp", ["timestamp"]),
});
```

#### Core Mutations and Queries
```typescript
// convex/claims.ts
export const claimStudent = mutation({
  args: { 
    studentId: v.string(), 
    studentName: v.string(),
    courseId: v.string(),
    topicId: v.string() 
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    // Check for existing claim
    const existingClaim = await ctx.db.query("studentClaims")
      .withIndex("by_student", q => 
        q.eq("studentId", args.studentId).eq("courseId", args.courseId)
      )
      .filter(q => q.gt(q.field("expiresAt"), Date.now()))
      .first();

    if (existingClaim && existingClaim.claimedBy !== identity.subject) {
      throw new Error(`Student already claimed by ${existingClaim.claimedByName}`);
    }

    // Create or update claim
    const claimData = {
      ...args,
      claimedBy: identity.subject,
      claimedByName: identity.name || identity.email,
      claimedAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
      status: "claimed" as const,
    };

    if (existingClaim) {
      await ctx.db.patch(existingClaim._id, claimData);
    } else {
      await ctx.db.insert("studentClaims", claimData);
    }

    return { success: true };
  }
});

export const releaseClaim = mutation({
  args: { studentId: v.string(), courseId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");

    const claim = await ctx.db.query("studentClaims")
      .withIndex("by_student", q => 
        q.eq("studentId", args.studentId).eq("courseId", args.courseId)
      )
      .filter(q => q.eq(q.field("claimedBy"), identity.subject))
      .first();

    if (claim) {
      await ctx.db.patch(claim._id, { 
        status: "released" as const,
        expiresAt: Date.now() 
      });
    }

    return { success: true };
  }
});

export const getActiveClaims = query({
  args: { courseId: v.string() },
  handler: async (ctx, { courseId }) => {
    const claims = await ctx.db.query("studentClaims")
      .withIndex("by_course", q => q.eq("courseId", courseId))
      .filter(q => q.gt(q.field("expiresAt"), Date.now()))
      .collect();

    return claims.reduce((acc, claim) => {
      acc[claim.studentId] = claim;
      return acc;
    }, {} as Record<string, any>);
  }
});
```

### Canvas Integration

#### Webhook Receiver
```typescript
// convex/canvas.ts
export const handleCanvasWebhook = internalMutation({
  args: { event: v.any() },
  handler: async (ctx, { event }) => {
    const { event_name, body } = event;
    
    switch (event_name) {
      case 'grade_change':
        await handleGradeChange(ctx, body);
        break;
      case 'discussion_entry_created':
        await handleNewReply(ctx, body);
        break;
      case 'submission_updated':
        await handleSubmissionUpdate(ctx, body);
        break;
    }
  }
});

const handleGradeChange = async (ctx: any, body: any) => {
  // Create notification for grade change
  await ctx.db.insert("gradeNotifications", {
    courseId: body.course_id,
    studentId: body.user_id,
    studentName: body.user_name || 'Unknown',
    topicId: body.assignment_id,
    topicTitle: body.assignment_name || 'Assignment',
    changeType: "graded",
    changedBy: body.grader_name,
    timestamp: Date.now(),
    acknowledged: [],
  });

  // Update sync status
  await updateSyncStatus(ctx, body.course_id, "webhook");
};
```

#### Smart Polling Fallback
```typescript
// convex/sync.ts
export const scheduleCanvasSync = internalMutation({
  handler: async (ctx) => {
    // Get courses that need syncing (every 2-5 minutes)
    const courses = await ctx.db.query("canvasSyncStatus")
      .filter(q => q.lt(q.field("nextSyncAt"), Date.now()))
      .collect();

    for (const course of courses) {
      await ctx.scheduler.runAfter(0, internal.sync.syncCourseData, {
        courseId: course.courseId
      });
    }
  }
});

export const syncCourseData = internalAction({
  args: { courseId: v.string() },
  handler: async (ctx, { courseId }) => {
    // Fetch latest Canvas data
    // Compare with cached data
    // Create notifications for changes
    // Update sync status
  }
});
```

### Frontend Integration

#### Real-time React Hooks
```typescript
// hooks/useRealtimeGrading.ts
export function useRealtimeGrading(courseId: string) {
  const claims = useQuery(api.claims.getActiveClaims, { courseId });
  const notifications = useQuery(api.notifications.getRecent, { courseId });
  const claimStudent = useMutation(api.claims.claimStudent);
  const releaseClaim = useMutation(api.claims.releaseClaim);

  return {
    claims: claims || {},
    notifications: notifications || [],
    claimStudent,
    releaseClaim,
    isStudentClaimed: (studentId: string) => !!claims?.[studentId],
    getClaimInfo: (studentId: string) => claims?.[studentId],
  };
}
```

#### Enhanced Student Badge Component
```typescript
// components/ui/CollaborativeStudentBadge.tsx
export function CollaborativeStudentBadge({ 
  student, 
  courseId,
  topicId,
  currentUser 
}: Props) {
  const { claims, claimStudent, releaseClaim } = useRealtimeGrading(courseId);
  const claim = claims[student.id];
  const isClaimedByMe = claim?.claimedBy === currentUser.id;
  const isClaimedByOther = claim && !isClaimedByMe;

  return (
    <div className="relative">
      <StudentBadge {...student} />
      
      {/* Claim Status Indicators */}
      {isClaimedByOther && (
        <div className="claim-indicator">
          🔒 {claim.claimedByName} is grading
          <span className="tooltip">
            Claimed {formatRelativeTime(claim.claimedAt)}
          </span>
        </div>
      )}

      {isClaimedByMe && (
        <button 
          onClick={() => releaseClaim({ studentId: student.id, courseId })}
          className="release-claim-btn"
        >
          ✅ Release Claim
        </button>
      )}

      {!claim && !student.isGraded && (
        <button
          onClick={() => claimStudent({
            studentId: student.id,
            studentName: student.name,
            courseId,
            topicId
          })}
          className="claim-btn"
        >
          📝 Claim for Grading
        </button>
      )}
    </div>
  );
}
```

## User Experience Design

### Visual Claim Indicators

#### Student Badge States
```
┌─ Unclaimed Student ────────────────┐
│ Rebecca Davis [3d ago] [Claim] ✏️  │
└────────────────────────────────────┘

┌─ Claimed by Me ────────────────────┐
│ Rebecca Davis [3d ago] [Release] ✅ │
└────────────────────────────────────┘

┌─ Claimed by Other ─────────────────┐
│ Rebecca Davis 🔒 John is grading   │
│ (Claimed 5 min ago)                │
└────────────────────────────────────┘

┌─ Recently Graded ──────────────────┐
│ Rebecca Davis ✓ [JS] (2 min ago)   │
└────────────────────────────────────┘
```

#### Real-time Notifications
```
┌─ Toast Notification ──────────────┐
│ 🔔 John Smith claimed Rebecca      │
│ Davis for grading                  │
│                    [View] [Dismiss]│
└────────────────────────────────────┘

┌─ Activity Feed ───────────────────┐
│ • Mary graded Alex Johnson (2m)   │
│ • John claimed Rebecca Davis (5m) │
│ • Sarah released Tom Wilson (8m)  │
└───────────────────────────────────┘
```

### Instructor Presence Dashboard
```
┌─ Active Instructors ──────────────┐
│ 👤 John Smith    • 3 claimed      │
│ 👤 Mary Davis    • 1 claimed      │
│ 👤 Sarah Johnson • Available      │
└───────────────────────────────────┘
```

## Implementation Timeline

### Phase 1: Foundation (Week 1-2)
- [ ] Convex project setup and authentication
- [ ] Basic database schema implementation
- [ ] Student claiming mutations and queries
- [ ] Simple claim/release UI integration

### Phase 2: Real-time Updates (Week 3-4)  
- [ ] Canvas webhook receiver setup
- [ ] Grade change notification system
- [ ] Real-time UI updates with React subscriptions
- [ ] Polling fallback for webhook failures

### Phase 3: Enhanced UX (Week 5-6)
- [ ] Advanced claim indicators and tooltips
- [ ] Instructor presence tracking
- [ ] Activity feed and notifications
- [ ] Conflict resolution UI

### Phase 4: Production Ready (Week 7-8)
- [ ] Auto-claim expiration and cleanup
- [ ] Performance optimization and caching
- [ ] Error handling and edge cases
- [ ] Analytics and monitoring

## Risk Assessment

### Technical Risks
- **Webhook Reliability**: Canvas webhooks may be unreliable or delayed
- **Claim Conflicts**: Race conditions in concurrent claim attempts
- **Performance Impact**: Real-time subscriptions could affect app performance
- **Data Consistency**: Sync issues between Canvas and Convex

### Mitigation Strategies
- **Hybrid Sync**: Combine webhooks with polling for redundancy
- **Optimistic UI**: Show immediate feedback while processing claims
- **Rate Limiting**: Prevent spam claiming/releasing
- **Conflict Resolution**: Clear UI for handling claim conflicts

### User Adoption Risks
- **Learning Curve**: Instructors need to adapt to new claiming workflow
- **Over-claiming**: Users might claim too many students without completing work
- **Coordination Issues**: Misunderstanding of claim system purpose

### Mitigation Strategies
- **Progressive Rollout**: Start with opt-in beta for select courses
- **Clear Onboarding**: Tutorial and help documentation
- **Smart Defaults**: Auto-release claims after reasonable time
- **Usage Analytics**: Monitor adoption and adjust UX accordingly

## Success Criteria

### Functional Requirements
- [ ] Claims prevent duplicate grading with 99%+ accuracy
- [ ] Real-time updates appear within 3 seconds
- [ ] Zero data loss during claim operations
- [ ] Graceful degradation when real-time features unavailable

### User Experience Goals
- [ ] Instructors report 80%+ reduction in coordination effort
- [ ] 90% of multi-instructor courses adopt claiming system
- [ ] User satisfaction rating > 4.5/5 for new features
- [ ] No increase in overall grading time per instructor

### Technical Performance
- [ ] Real-time features add < 100ms to page load times
- [ ] Claim operations complete in < 500ms
- [ ] System handles 50+ concurrent instructors per course
- [ ] 99.9% uptime for collaboration features

## Future Enhancements

### Advanced Collaboration Features
- **Grading Templates**: Shared rubrics and comment templates
- **Workload Balancing**: AI-suggested student assignments based on instructor capacity
- **Video Collaboration**: Shared screen for discussing difficult cases
- **Bulk Operations**: Claim multiple students at once for focused grading sessions

### Analytics and Insights
- **Grading Velocity**: Track time-to-feedback per instructor
- **Quality Metrics**: Consistency analysis across graders
- **Student Outcomes**: Correlation between feedback timing and performance
- **Team Efficiency**: Identify collaboration patterns and bottlenecks

### Integration Opportunities
- **Canvas Gradebook Sync**: Bi-directional real-time grade updates
- **Calendar Integration**: Block time for focused grading sessions
- **Mobile App**: iOS/Android app for quick claim management
- **Slack/Teams**: Notifications in instructor communication channels

## Conclusion

This real-time grading collaboration system transforms Canvas Discussion Browser from a individual tool into a true collaborative platform. By eliminating grading conflicts and providing real-time coordination, instructors can work more efficiently while students receive faster, more consistent feedback.

The Convex-powered architecture ensures reliable real-time updates while maintaining the existing performance optimizations. The claiming system prevents duplicate work while preserving instructor autonomy and flexibility.

This enhancement positions the tool as an essential platform for multi-instructor courses, potentially expanding its adoption across larger educational institutions and collaborative teaching environments.