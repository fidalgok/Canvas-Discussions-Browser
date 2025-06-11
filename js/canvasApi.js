// Minimal Canvas API client for Next.js (browser/client-side)
// Uses fetch, no external deps required


// All browser requests go through the Next.js API proxy to avoid CORS issues
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

function logPost(post) {
  return {
    id: post.id,
    title: post.topic_title,
    message: post.message?.substring(0, 50),
    user: post.user_name || post.user?.display_name,
    isReply: Boolean(post.parent_id)
  };
}

export async function fetchCanvasDiscussions({ apiUrl, apiKey, courseId }) {
  // Check for cached data (no automatic expiry)
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
  
  // 1. Fetch all discussion topics
  const topics = await canvasProxy({
    apiUrl,
    apiKey,
    endpoint: `/courses/${courseId}/discussion_topics`,
    method: 'GET'
  });

  // 2. Fetch all entries for each topic
  const seenIds = new Set(); // Track unique IDs to prevent duplicates
  let allPosts = [];

  for (const topic of topics) {
    // Fetch all entries with pagination
    let allEntries = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const entries = await canvasProxy({
        apiUrl,
        apiKey,
        endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries?per_page=100&page=${page}`,
        method: 'GET'
      });
      
      allEntries = allEntries.concat(entries);
      
      // Check if we got fewer entries than requested (indicates last page)
      hasMore = entries.length === 100;
      page++;
    }
    
    const entries = allEntries;

    for (const entry of entries) {
      // Only add if we haven't seen this ID before
      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        entry.topic_title = topic.title;
        entry.discussion_topic_id = topic.id;
        if (typeof topic.assignment_id !== 'undefined') {
          entry.assignment_id = topic.assignment_id;
        }
        allPosts.push(entry);

        // Fetch and add replies to this entry with pagination
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

        for (const reply of replies) {
          // Only add if we haven't seen this ID before
          if (!seenIds.has(reply.id)) {
            seenIds.add(reply.id);
            reply.topic_title = topic.title;
            reply.discussion_topic_id = topic.id;
            reply.parent_id = entry.id;
            if (typeof topic.assignment_id !== 'undefined') {
              reply.assignment_id = topic.assignment_id;
            }
            allPosts.push(reply);
          }
        }
      }
    }
  }

  // Cache the results
  localStorage.setItem(cacheKey, JSON.stringify({
    data: allPosts,
    timestamp: Date.now()
  }));

  return allPosts;
}

export async function fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName, userId }) {
  const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
  
  console.log('=== All Posts ===');
  allPosts.forEach(post => {
    if (post.topic_title.includes('Module 1 | Reflection')) {
      console.log(logPost(post));
    }
  });

  // First, get all top-level posts by the user (no parent_id)
  const userMainPosts = allPosts.filter(post => {
    const isUserPost = (
      ((post.user && (post.user.id == userId || post.user.display_name === userName)) ||
       post.user_id == userId ||
       post.user_name === userName) &&
      !post.parent_id  // Only include posts without a parent_id
    );
    return isUserPost;
  });

  // Get IDs of all the user's main posts
  const userMainPostIds = userMainPosts.map(post => post.id);

  // Track which replies we've seen for each parent post
  const repliesByParent = new Map();

  // Get all replies to the user's posts (regardless of who made the reply)
  const repliesToUserPosts = allPosts.filter(post => {
    // Only consider posts that are replies to user's main posts
    if (!userMainPostIds.includes(post.parent_id)) return false;
    
    // If we haven't seen any replies for this parent yet, initialize the array
    if (!repliesByParent.has(post.parent_id)) {
      repliesByParent.set(post.parent_id, []);
    }
    
    // Add this reply to its parent's array
    repliesByParent.get(post.parent_id).push(post);
    
    return true;
  });

  // Combine main posts and replies
  const postsAndReplies = [...userMainPosts, ...repliesToUserPosts];

  console.log('FILTERED POSTS:', postsAndReplies.map(p => ({
    id: p.id,
    parent_id: p.parent_id,
    user_name: p.user_name,
    is_reply: Boolean(p.parent_id)
  })));

  return postsAndReplies;
}

export function clearCache(courseId) {
  const cacheKey = `canvas_discussions_${courseId}`;
  localStorage.removeItem(cacheKey);
  console.log('✓ Cache cleared for course', courseId);
}

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
