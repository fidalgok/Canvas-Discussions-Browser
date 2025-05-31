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
    // Attach topic title to each post
    for (const entry of entries) {
      entry.topic_title = topic.title;
      allPosts.push(entry);
    }
  }
  return allPosts;
}

export async function fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName }) {
  const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
  return allPosts.filter(post =>
    (post.user && post.user.display_name === userName) ||
    post.user_name === userName
  );
}
