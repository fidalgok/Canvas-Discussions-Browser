# Canvas API Rules & Best Practices

## Core Principles

### 1. User Data Limitations
- **Canvas Discussion Posts DO NOT include user emails** - only display names
- User identification must rely on `user_id` or fuzzy name matching
- Never assume email availability in discussion endpoints

### 2. Boston College Specific Patterns
- Email format: `username@bc.edu`
- Usernames not directly available in discussion post data
- Must use Canvas Enrollments API to get reliable user identification

## API Endpoint Patterns

### Discussion Posts Structure
```javascript
{
  id: 16406303,
  user_id: 6169976,
  user_name: "Display Name Here", // NOT username, this is display name
  message: "<html content>",
  user: {
    id: 6169976,
    display_name: "Display Name Here",
    avatar_image_url: "...",
    html_url: "...",
    pronouns: null
  },
  topic_title: "Module 1 | Reflection",
  discussion_topic_id: 8341034,
  assignment_id: 7519854,
  recent_replies: [/* nested replies with same structure */]
}
```

### Enrollments API Structure
```javascript
{
  id: 12345,
  user_id: 6169976,
  course_id: 1671573,
  type: "StudentEnrollment", // or "TeacherEnrollment", "TaEnrollment", "DesignerEnrollment"
  user: {
    id: 6169976,
    name: "Display Name",
    sis_user_id: "username", // This is the actual username!
    login_id: "username@bc.edu"
  }
}
```

## Required API Calls for User Management

### 1. Get Discussion Posts
```
GET /api/v1/courses/{course_id}/discussion_topics/{topic_id}/entries?per_page=100&page=1
```

### 2. Get Course Enrollments (Essential for Teacher Filtering)
```
GET /api/v1/courses/{course_id}/enrollments?per_page=100&page=1
```

## User Identification Strategy

### Priority Order:
1. **Use `user_id` for exact matching** when available
2. **Fuzzy name matching** for cross-referencing with external data
3. **Email construction from enrollments** when username available

### Name Normalization Rules:
```javascript
function normalizeNameForMatching(name) {
  if (!name || typeof name !== 'string') return '';
  
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*/g, ' ')      // Remove parentheses content
    .replace(/\b[a-z]\b/g, '')            // Remove middle initials
    .replace(/\bjonathan\b/g, 'jon')      // Common nickname mappings
    .replace(/\btimothy\b/g, 'tim')
    .replace(/\bsteven?\b/g, 'steve')
    .replace(/\bnathaniel\b/g, 'nate')
    .replace(/\braymond\b/g, 'ray')
    .replace(/\bkimberlyn\b/g, 'kim')     // Institution-specific mappings
    .replace(/\bkimberly\b/g, 'kim')
    .replace(/[^\w\s]/g, '')              // Remove punctuation
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .trim();
  
  // Handle "Last, First" format by converting to sorted words
  const words = normalized.split(' ').filter(word => word.length > 0);
  return words.sort().join(' ');
}
```

## Teacher/Staff Filtering

### Required Pattern:
Always exclude these enrollment types from student analytics:
- `TeacherEnrollment`
- `TaEnrollment` 
- `DesignerEnrollment`

### Implementation:
```javascript
// 1. Get enrollments first
const enrollments = await fetchCourseEnrollments(courseId);
const teacherUserIds = enrollments
  .filter(e => ['TeacherEnrollment', 'TaEnrollment', 'DesignerEnrollment'].includes(e.type))
  .map(e => e.user_id);

// 2. Filter participants
const studentParticipants = allParticipants.filter(p => 
  !teacherUserIds.includes(parseInt(p.id))
);
```

## API Performance Optimization

### Critical Optimization: Batch Reply Fetching

**Problem**: Canvas API requires separate calls for each discussion entry's replies, leading to N+1 query problems.

**Solution**: Use `include[]=recent_replies` parameter to fetch replies with initial entry request.

#### Before Optimization (Inefficient):
```javascript
// This creates N+1 API calls: 1 for entries + N for each entry's replies
const entries = await fetch(`/courses/${courseId}/discussion_topics/${topic.id}/entries?per_page=100`);
for (const entry of entries) {
  const replies = await fetch(`/courses/${courseId}/discussion_topics/${topic.id}/entries/${entry.id}/replies`);
  // 147 total API calls for 75 students!
}
```

#### After Optimization (Efficient):
```javascript
// This includes replies in initial request, reducing API calls by 93%
const entries = await fetch(`/courses/${courseId}/discussion_topics/${topic.id}/entries?per_page=100&include[]=recent_replies`);
// Only 10 API calls total for same dataset!

// Process included replies directly
entries.forEach(entry => {
  const replies = entry.recent_replies || [];
  // No additional API calls needed
});
```

### Performance Results
- **Before**: 147 API calls for 75 students across 2 topics
- **After**: 10 API calls for same dataset
- **Improvement**: 93% reduction in API requests
- **User Impact**: Near-instant loading vs 8+ second delays

### Shared Data Processing Pattern

**Problem**: Multiple dashboard views making duplicate API calls for same data.

**Solution**: Centralized data processor with intelligent caching.

```javascript
// js/gradingDataProcessor.js - Shared processing utility
export async function processCanvasDataForDashboards({ apiUrl, apiKey, courseId }) {
  // Check for processed data cache first
  const processingCacheKey = `canvas_processed_${courseId}`;
  const cached = localStorage.getItem(processingCacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    console.log('✓ Using cached processed dashboard data', new Date(timestamp));
    return data;
  }

  // Fetch raw Canvas data once
  const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
  
  // Process for multiple dashboard views
  const processedData = {
    recentPosts: filterRecentActivity(allPosts),
    gradingTopics: await processGradingTopics(allPosts, teacherUserIds, { apiUrl, apiKey, courseId }),
    uniqueUsers: extractUniqueUsers(allPosts)
  };
  
  // Cache processed results
  localStorage.setItem(processingCacheKey, JSON.stringify({
    data: processedData,
    timestamp: Date.now()
  }));
  
  return processedData;
}
```

## Pagination Best Practices

### Always Use Pagination:
- Default Canvas page size is ~10-20 items
- Use `per_page=100` for efficiency
- Loop through all pages until empty response
- **NEW**: Include reply data to avoid N+1 queries

### Optimized Example:
```javascript
let allData = [];
let page = 1;
let hasMore = true;

while (hasMore) {
  // CRITICAL: Include recent_replies to avoid separate API calls
  const response = await fetch(`${endpoint}?per_page=100&page=${page}&include[]=recent_replies`);
  const pageData = await response.json();
  
  if (pageData.length === 0) {
    hasMore = false;
  } else {
    allData = allData.concat(pageData);
    page++;
  }
}
```

### Batch Assignment Submission Fetching

**Optimization**: Fetch all assignment submissions in batch rather than individual user lookups.

```javascript
// Efficient: Batch fetch all submissions for assignment
async function fetchAssignmentSubmissionsBatch({ apiUrl, apiKey, courseId }, assignmentIds) {
  const submissionsByAssignment = {};
  
  for (const assignmentId of assignmentIds) {
    const submissions = await canvasProxy({
      apiUrl, apiKey,
      endpoint: `/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100`,
      method: 'GET'
    });
    submissionsByAssignment[assignmentId] = submissions;
  }
  
  return submissionsByAssignment;
}

// Create lookup map for O(1) access
const submissionByUserId = {};
submissions.forEach(submission => {
  submissionByUserId[submission.user_id] = submission;
});
```

## Data Matching Strategies

### Canvas ↔ External Data Matching

#### When External Data Has Emails:
1. Use Canvas Enrollments API to get usernames/emails
2. Match by email address (most reliable)
3. Fall back to fuzzy name matching

#### When Only Names Available (Google Sheets Integration):
1. Extract all unique users from Canvas discussions
2. Normalize both Canvas and external names
3. Use fuzzy matching with exact match priority
4. Implement subset matching for partial name variations

### Google Sheets Integration Pattern:
```javascript
// Multi-tier matching strategy
function matchUsersWithSheetsData(canvasUsers, sheetsData) {
  canvasUsers.forEach(canvasUser => {
    const canvasName = canvasUser.display_name || canvasUser.user_name;
    
    // 1. Try exact match first
    let sheetMatch = sheetsData.find(sheetUser => 
      sheetUser.displayName === canvasName
    );
    
    // 2. Try fuzzy match if exact fails
    if (!sheetMatch) {
      const normalizedCanvas = normalizeNameForMatching(canvasName);
      
      sheetMatch = sheetsData.find(sheetUser => {
        const normalizedSheet = normalizeNameForMatching(sheetUser.displayName);
        
        // Exact normalized match
        if (normalizedCanvas === normalizedSheet) return true;
        
        // Subset matching for middle names
        const canvasWords = normalizedCanvas.split(' ');
        const sheetWords = normalizedSheet.split(' ');
        const canvasSet = new Set(canvasWords);
        const sheetSet = new Set(sheetWords);
        
        return canvasWords.every(word => sheetSet.has(word)) ||
               sheetWords.every(word => canvasSet.has(word));
      });
    }
    
    // 3. Create enhanced user object if match found
    if (sheetMatch) {
      return {
        ...canvasUser,
        enhancedData: {
          source: 'google_sheets',
          ...sheetMatch,
          matchType: sheetMatch.displayName === canvasName ? 'exact' : 'fuzzy'
        }
      };
    }
  });
}
```

### Example Implementation:
```javascript
// Try exact match first
if (canvasName === externalName) {
  return { match: true, confidence: 1.0 };
}

// Try normalized fuzzy match
const normalizedCanvas = normalizeNameForMatching(canvasName);
const normalizedExternal = normalizeNameForMatching(externalName);

if (normalizedCanvas === normalizedExternal) {
  return { match: true, confidence: 0.8 };
}

return { match: false, confidence: 0.0 };
```

## CORS and Proxy Patterns

### Required for Browser-Based Apps:
Canvas API requires authentication and has CORS restrictions.

### Solution:
Create API proxy endpoint:
```javascript
// /api/canvas-proxy.js
export default async function handler(req, res) {
  const { apiUrl, apiKey, endpoint, method = 'GET', body } = req.body;
  
  const response = await fetch(`${apiUrl}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

## Security Considerations

### Current Implementation (Proof of Concept)

**Credential Storage**: 
- ✅ **sessionStorage** (as of 2025-07-04) - Credentials cleared when browser tab closes
- ✅ **Tab isolation** - Credentials don't persist across browser tabs
- ⚠️ **Still vulnerable to XSS** - Any script on domain can access credentials
- ⚠️ **User manages own tokens** - Each user enters their Canvas API token

**Security Benefits**:
- Credentials automatically cleared on browser close
- No persistent storage of sensitive data
- Reduced attack surface compared to localStorage

### Migration Roadmap

#### Phase 1: sessionStorage (Current - PoC Stage)
```javascript
// Current: Client-side credential management
sessionStorage.setItem('canvas_api_key', apiKey);
```

#### Phase 2: Server-Side Sessions (Next Phase)
```javascript
// Future: Server manages credentials securely
POST /api/auth/canvas-login
{
  "apiUrl": "https://bostoncollege.instructure.com/api/v1",
  "apiKey": "canvas_token_here",
  "courseId": "12345"
}
// Server stores encrypted in session, returns session cookie
// All Canvas API calls use server-stored credentials
```

#### Phase 3: Full Authentication System (Long-term)
- User accounts with proper authentication
- Database storage for user-specific configurations
- Canvas OAuth integration
- Admin-managed Canvas tokens

### Implementation Notes for Future Phases

**Phase 2 Requirements**:
- Add session middleware (express-session, Redis)
- Encrypt credentials before session storage
- Update CanvasProvider to authenticate via session
- Maintain course-switching capability

**Phase 3 Requirements**:
- User registration/login system
- Database schema for user credentials
- Canvas OAuth app registration
- Admin interface for Canvas instance management

### Security Best Practices

1. **Never log API tokens** in console or server logs
2. **Validate all inputs** before proxy requests
3. **Rate limit API calls** to prevent abuse
4. **Use HTTPS** in production environments
5. **Regular token rotation** (remind users to refresh tokens)

### Current Limitations

- Multi-user deployments require manual token management
- No centralized credential management
- Limited audit trail for API usage
- Relies on user understanding of Canvas token security

## Common Gotchas

### 1. Display Names vs Usernames
- Canvas often shows "Display Name" where you expect username
- Always verify which field contains what data
- Use Enrollments API for authoritative username data

### 2. Missing User Data
- Some posts may have `user: null` for deleted accounts
- Always check for null/undefined before accessing user properties
- Implement fallback strategies for missing data

### 3. HTML Content in Messages
- Canvas messages contain HTML, not plain text
- Sanitize with DOMPurify before displaying
- Consider using Turndown.js for HTML→Markdown conversion

### 4. Nested Replies Structure
- Replies are in `recent_replies` array, not separate API calls
- Each reply has same structure as top-level posts
- May need recursive processing for deeply nested threads

## Testing Strategies

### Essential Test Cases:
1. **Large courses** (100+ students) - test pagination
2. **Courses with TAs** - test teacher filtering
3. **Users with middle initials** - test name normalization
4. **Users with nicknames** - test fuzzy matching
5. **Deleted user accounts** - test null handling

### Data Validation Patterns:
```javascript
// Always log participant counts for sanity checking
console.log(`Canvas users: ${canvasUsers.length}`);
console.log(`After teacher filtering: ${studentUsers.length}`);
console.log(`External data matches: ${matchedUsers.length}`);
console.log(`Final engaged participants: ${engagedUsers.length}`);
```

## Future Considerations

### Potential Enhancements:
1. **Configuration files** for course-specific patterns
2. **Automatic nickname detection** from common patterns
3. **Machine learning name matching** for complex cases
4. **Real-time sync** capabilities with Canvas webhooks

### Scalability Notes:
- Canvas API has rate limiting - implement backoff strategies
- Consider caching strategies for large datasets
- Local storage works well for development/small deployments

---

## Quick Reference Checklist

✅ Always get enrollments first for teacher filtering  
✅ Use `per_page=100` and handle pagination  
✅ Normalize names for fuzzy matching  
✅ Handle null/undefined user data gracefully  
✅ Log participant counts at each filtering step  
✅ Test with courses containing TAs and large enrollments  
✅ Use proxy API for CORS in browser apps  
✅ Never assume email availability in discussion endpoints  
✅ Implement multi-tier matching for external data integration  
✅ Use separate cache namespaces for different data sources  

## External Data Integration Notes

### Google Sheets Integration (Implemented)
- **Schema**: 8-column format with display name matching
- **API Pattern**: Public sheet access via Google Sheets API v4
- **Caching**: Separate cache namespace (`sheets_cache_`) to avoid conflicts
- **Matching**: Three-tier strategy (exact → fuzzy → subset)
- **Performance**: Cached indefinitely until manual refresh

### Future Integration Patterns
- **Database Systems**: SQL/NoSQL external data sources
- **LDAP/AD**: Institutional directory services  
- **Canvas Gradebook**: Bi-directional sync with Canvas data
- **External APIs**: Other LMS or student information systems

This document should be updated as new Canvas API patterns are discovered.