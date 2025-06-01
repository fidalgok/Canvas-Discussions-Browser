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

export async function fetchCanvasDiscussions({ apiUrl, apiKey, courseId }) {
  // 1. Fetch all discussion topics
  const topics = await canvasProxy({
    apiUrl,
    apiKey,
    endpoint: `/courses/${courseId}/discussion_topics`,
    method: 'GET'
  });

  // 2. Fetch all entries for each topic
  let allPosts = [];
  for (const topic of topics) {
    const entries = await canvasProxy({
      apiUrl,
      apiKey,
      endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries`,
      method: 'GET'
    });
    for (const entry of entries) {
      entry.topic_title = topic.title;
      if (typeof topic.assignment_id !== 'undefined') {
        entry.assignment_id = topic.assignment_id;
      }
      allPosts.push(entry);
      // Fetch and add replies to this entry
      const replies = await canvasProxy({
        apiUrl,
        apiKey,
        endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries/${entry.id}/replies`,
        method: 'GET'
      });
      console.log('REPLIES for entry', entry.id, ':', replies.map(r => ({id: r.id, user_id: r.user_id, user_name: r.user_name, display_name: r.user?.display_name})));
      for (const reply of replies) {
        reply.topic_title = topic.title;
        if (typeof topic.assignment_id !== 'undefined') {
          reply.assignment_id = topic.assignment_id;
        }
        allPosts.push(reply);
      }
    }
  }
  return allPosts;
}

export async function fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName, userId }) {
  const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
  console.log('ALL POSTS:', allPosts.map(p => ({ id: p.id, user_id: p.user_id, user_name: p.user_name, display_name: p.user?.display_name })));
  return allPosts.filter(post =>
    (post.user && (post.user.id == userId || post.user.display_name === userName)) ||
    post.user_id == userId ||
    post.user_name === userName
  );
}
