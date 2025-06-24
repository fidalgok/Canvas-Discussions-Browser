/**
 * Canvas API Client for Next.js Browser Environment
 * 
 * This client handles all Canvas LMS API interactions for the discussion browser.
 * Key features:
 * - CORS-compliant proxy pattern for browser-based Canvas API access
 * - Comprehensive pagination handling for large datasets
 * - Intelligent caching with manual refresh control
 * - Discussion post and reply fetching with deduplication
 * - User-specific post filtering and threading
 * 
 * All requests are routed through /api/canvas-proxy.js to avoid CORS issues
 * and keep API tokens secure on the server side.
 */

/**
 * Proxy function to make Canvas API requests through Next.js API route
 * Handles CORS issues by routing all Canvas API calls through server-side proxy
 * 
 * @param {Object} params - API request parameters
 * @param {string} params.apiUrl - Canvas API base URL
 * @param {string} params.apiKey - Canvas API access token
 * @param {string} params.endpoint - Canvas API endpoint path
 * @param {string} params.method - HTTP method (default: 'GET')
 * @param {Object} params.body - Request body for POST/PUT requests
 * @returns {Promise<Object>} Canvas API response data
 */
async function canvasProxy({ apiUrl, apiKey, endpoint, method = 'GET', body }) {
  const res = await fetch('/api/canvas-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiUrl, apiKey, endpoint, method, body })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch from Canvas API');
  }
  return res.json();
}

/**
 * Helper function for debugging post data structure
 * Creates a simplified view of Canvas discussion posts for console logging
 * 
 * @param {Object} post - Canvas discussion post object
 * @returns {Object} Simplified post object for debugging
 */
function logPost(post) {
  return {
    id: post.id,
    title: post.topic_title,
    message: post.message?.substring(0, 50),
    user: post.user_name || post.user?.display_name,
    isReply: Boolean(post.parent_id)
  };
}

/**
 * Fetches all discussion posts for a Canvas course with comprehensive pagination
 * 
 * Core functionality:
 * - Fetches all discussion topics for the course
 * - Gets all posts (entries) for each topic with full pagination
 * - Fetches all replies for each post with full pagination
 * - Implements deduplication to prevent duplicate posts
 * - Adds topic context (title, assignment_id) to each post
 * - Caches results in browser localStorage for performance
 * 
 * Canvas API Pagination Pattern:
 * - Uses per_page=100 for efficiency (Canvas default is ~10-20)
 * - Loops through pages until empty response
 * - Handles both discussion entries and replies with separate pagination
 * 
 * @param {Object} params - API parameters
 * @param {string} params.apiUrl - Canvas API base URL
 * @param {string} params.apiKey - Canvas API access token  
 * @param {string} params.courseId - Canvas course ID
 * @returns {Promise<Array>} Array of all discussion posts with replies
 */
export async function fetchCanvasDiscussions({ apiUrl, apiKey, courseId }) {
  // Check for cached data (manual refresh only - no automatic expiry)
  const cacheKey = `canvas_discussions_${courseId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      console.log('✓ Using cached discussion data', new Date(timestamp));
      return data;
    } catch (error) {
      localStorage.removeItem(cacheKey);
    }
  }

  console.log('→ Fetching fresh discussion data from Canvas API');
  
  // Step 1: Fetch all discussion topics for the course
  const topics = await canvasProxy({
    apiUrl,
    apiKey,
    endpoint: `/courses/${courseId}/discussion_topics`,
    method: 'GET'
  });

  // Step 2: Fetch all discussion entries and replies for each topic
  // Use Set-based deduplication to prevent duplicate posts across topics
  const seenIds = new Set(); // Track unique post IDs to prevent duplicates
  let allPosts = [];

  for (const topic of topics) {
    // Fetch all top-level entries for this topic with full pagination
    let allEntries = [];
    let page = 1;
    let hasMore = true;
    
    // Canvas API pagination: loop until we get fewer than 100 results
    while (hasMore) {
      const entries = await canvasProxy({
        apiUrl,
        apiKey,
        endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries?per_page=100&page=${page}`,
        method: 'GET'
      });
      
      allEntries = allEntries.concat(entries);
      
      // Canvas pagination: if we get fewer than 100 results, we've reached the last page
      hasMore = entries.length === 100;
      page++;
    }
    
    const entries = allEntries;

    // Process each top-level discussion entry
    for (const entry of entries) {
      // Deduplication: only add if we haven't seen this post ID before
      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        // Enrich post data with topic context
        entry.topic_title = topic.title;
        entry.discussion_topic_id = topic.id;
        if (typeof topic.assignment_id !== 'undefined') {
          entry.assignment_id = topic.assignment_id;
        }
        allPosts.push(entry);

        // Fetch all replies to this entry with full pagination
        // Note: Canvas API requires separate calls for replies to each entry
        let allReplies = [];
        let replyPage = 1;
        let hasMoreReplies = true;
        
        while (hasMoreReplies) {
          const replies = await canvasProxy({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries/${entry.id}/replies?per_page=100&page=${replyPage}`,
            method: 'GET'
          });
          
          allReplies = allReplies.concat(replies);
          hasMoreReplies = replies.length === 100;
          replyPage++;
        }
        
        const replies = allReplies;

        // Process each reply with same deduplication and enrichment
        for (const reply of replies) {
          // Deduplication: only add if we haven't seen this reply ID before
          if (!seenIds.has(reply.id)) {
            seenIds.add(reply.id);
            // Enrich reply data with topic and parent context
            reply.topic_title = topic.title;
            reply.discussion_topic_id = topic.id;
            reply.parent_id = entry.id; // Link reply to parent entry
            if (typeof topic.assignment_id !== 'undefined') {
              reply.assignment_id = topic.assignment_id;
            }
            allPosts.push(reply);
          }
        }
      }
    }
  }

  // Cache the complete dataset in browser localStorage
  // Cache persists until manual refresh - no automatic expiry
  localStorage.setItem(cacheKey, JSON.stringify({
    data: allPosts,
    timestamp: Date.now()
  }));

  return allPosts;
}

/**
 * Fetches all posts by a specific user, including replies to their posts
 * 
 * Functionality:
 * - Gets all discussion posts using fetchCanvasDiscussions()
 * - Filters for posts by the specified user (by display name or user ID)
 * - Includes replies to user's posts (regardless of who made the reply)
 * - Organizes posts and replies for threaded display
 * 
 * User Identification:
 * - Uses Canvas user.display_name or user_name fields
 * - Matches by user_id when available (more reliable)
 * - Falls back to display name matching
 * 
 * @param {Object} params - API parameters
 * @param {string} params.apiUrl - Canvas API base URL
 * @param {string} params.apiKey - Canvas API access token
 * @param {string} params.courseId - Canvas course ID
 * @param {string} params.userName - User's display name for filtering
 * @param {string} params.userId - Canvas user ID for filtering (optional but more reliable)
 * @returns {Promise<Array>} Array of user's posts and replies to their posts
 */
export async function fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName, userId }) {
  // Get all course discussions first
  const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
  
  // Debug logging for specific topic (can be removed in production)
  console.log('=== All Posts ===');
  allPosts.forEach(post => {
    if (post.topic_title.includes('Module 1 | Reflection')) {
      console.log(logPost(post));
    }
  });

  // Step 1: Get all top-level posts by the user (posts without parent_id)
  // Canvas user identification can use multiple fields - check all possibilities
  const userMainPosts = allPosts.filter(post => {
    const isUserPost = (
      ((post.user && (post.user.id == userId || post.user.display_name === userName)) ||
       post.user_id == userId ||
       post.user_name === userName) &&
      !post.parent_id  // Only include top-level posts (no parent)
    );
    return isUserPost;
  });

  // Step 2: Get all replies to the user's posts (regardless of who made the reply)
  // This creates a comprehensive view of the user's discussion threads
  const userMainPostIds = userMainPosts.map(post => post.id);

  // Track replies by parent post for organization
  const repliesByParent = new Map();

  // Find all replies to the user's top-level posts
  const repliesToUserPosts = allPosts.filter(post => {
    // Only include posts that are replies to user's main posts
    if (!userMainPostIds.includes(post.parent_id)) return false;
    
    // Organize replies by parent post for threaded display
    if (!repliesByParent.has(post.parent_id)) {
      repliesByParent.set(post.parent_id, []);
    }
    
    // Add this reply to its parent's reply array
    repliesByParent.get(post.parent_id).push(post);
    
    return true;
  });

  // Step 3: Combine user's main posts with all replies to those posts
  // This gives a complete view of the user's discussion participation
  const postsAndReplies = [...userMainPosts, ...repliesToUserPosts];

  console.log('FILTERED POSTS:', postsAndReplies.map(p => ({
    id: p.id,
    parent_id: p.parent_id,
    user_name: p.user_name,
    is_reply: Boolean(p.parent_id)
  })));

  return postsAndReplies;
}

/**
 * Clears cached discussion data for a specific course
 * Used when user wants fresh data or when settings change
 * 
 * @param {string} courseId - Canvas course ID
 */
export function clearCache(courseId) {
  const cacheKey = `canvas_discussions_${courseId}`;
  localStorage.removeItem(cacheKey);
  console.log('✓ Cache cleared for course', courseId);
}

/**
 * Gets the timestamp when discussion data was last cached
 * Used to display cache age to users
 * 
 * @param {string} courseId - Canvas course ID
 * @returns {number|null} Cache timestamp or null if no cache exists
 */
export function getCacheTimestamp(courseId) {
  const cacheKey = `canvas_discussions_${courseId}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const { timestamp } = JSON.parse(cached);
      return timestamp;
    } catch (error) {
      return null;
    }
  }
  return null;
}
