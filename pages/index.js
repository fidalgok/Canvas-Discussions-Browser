import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import Link from 'next/link';
import { fetchCanvasDiscussions } from '../js/canvasApi';

export default function Home() {
  // ...existing state
  // Add this handler to download all discussions as markdown
  // Helper: Check if credentials are set
  function credentialsMissing() {
    return !apiUrl || !apiKey || !courseId;
  }

  async function handleDownloadMarkdown() {
    // Load Turndown library dynamically if not already loaded
    if (!window.TurndownService) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/turndown.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }
    const turndownService = new window.TurndownService({ headingStyle: 'atx' });

    turndownService.remove('script');
    turndownService.remove('style');
    turndownService.remove('link');

    function htmlToMarkdown(html) {
  // Sanitize HTML before converting to markdown (extra safety)
  html = DOMPurify.sanitize(html);
      // Remove script/style/link tags before conversion
      html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                 .replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<link[\s\S]*?>/gi, '');
      return turndownService.turndown(html).replace(/\n{2,}/g, '\n\n');
    }

    function buildThread(entries, parentId = null, depth = 0) {
      // Recursively build markdown for entries (posts/replies) in thread order
      let md = '';
      // For top-level, parentId is null, so we use all entries
      const children = parentId === null ? entries : (entries || []).filter(e => (e.parent_id || null) === parentId);
      // Sort by created_at
      children.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      for (const entry of children) {
        const author = entry.user?.display_name || entry.user_name || 'Unknown';
        const date = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
        const heading = `${'#'.repeat(2 + depth)} ${depth > 0 ? 'Reply: ' : ''}${author} at ${date}`;
        let message = htmlToMarkdown(DOMPurify.sanitize(entry.message || ''));
        // Indent replies with > for each depth level
        if (depth > 0) {
          message = message.split('\n').map(line => '>'.repeat(depth) + ' ' + line).join('\n');
        }
        md += `\n${heading}\n\n${message}\n`;
        // Recursively add replies from _replies (threaded)
        if (entry._replies && entry._replies.length > 0) {
          md += buildThread(entry._replies, null, depth + 1);
        }
        // Recursively add replies based on parent_id (for legacy flat thread)
        md += buildThread(entries, entry.id, depth + 1);
      }
      return md;
    }

    const apiUrl = localStorage.getItem('canvas_api_url') || '';
    const apiKey = localStorage.getItem('canvas_api_key') || '';
    const courseId = localStorage.getItem('course_id') || '';
    if (credentialsMissing()) {
      alert('Please set your Canvas API credentials and Course ID in Settings first.');
      return;
    }
    // 1. Fetch all topics
    const topicsRes = await fetch('/api/canvas-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiUrl,
        apiKey,
        endpoint: `/courses/${courseId}/discussion_topics`,
        method: 'GET'
      })
    });
    if (!topicsRes.ok) {
      alert('Failed to fetch discussion topics.');
      return;
    }
    const topics = await topicsRes.json();
    // 2. For each topic, fetch entries and their replies
    let topicEntries = [];
    for (const topic of topics) {
      // Fetch top-level entries
      const entriesRes = await fetch('/api/canvas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl,
          apiKey,
          endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries`,
          method: 'GET'
        })
      });
      let entries = entriesRes.ok ? await entriesRes.json() : [];
      // For each entry, fetch its replies (threaded replies)
      for (const entry of entries) {
        // Replies endpoint: /discussion_topics/:topic_id/entries/:entry_id/replies
        const repliesRes = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}/discussion_topics/${topic.id}/entries/${entry.id}/replies`,
            method: 'GET'
          })
        });
        const replies = repliesRes.ok ? await repliesRes.json() : [];
        entry._replies = replies;
      }
      topicEntries.push({
        ...topic,
        entries,
      });
    }
    // 3. Sort topics by due date (or title if no due date)
    topicEntries.sort((a, b) => {
      if (a.due_at && b.due_at) {
        return new Date(a.due_at) - new Date(b.due_at);
      }
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return a.title.localeCompare(b.title);
    });
    // 4. Format as markdown
    let md = '';
    for (const topic of topicEntries) {
      md += `# ${topic.title}\n`;
      if (topic.due_at) {
        md += `*Due: ${new Date(topic.due_at).toLocaleString()}*\n`;
      }
      if (topic.entries && topic.entries.length > 0) {
        md += buildThread(topic.entries);
      } else {
        md += '\n_No posts in this topic._\n';
      }
      md += '\n---\n\n';
    }
    // 5. Trigger file download
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas-discussions-${courseId}.md`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setApiUrl(localStorage.getItem('canvas_api_url') || '');
    setApiKey(localStorage.getItem('canvas_api_key') || '');
    setCourseId(localStorage.getItem('course_id') || '');
  }, []);

  useEffect(() => {
    if (!apiUrl || !apiKey || !courseId) return;
    setLoading(true);
    setError('');
    fetchCanvasDiscussions({ apiUrl, apiKey, courseId })
      .then(posts => {
        if (posts.length > 0) {
          // Debug: log the first post to see structure
          console.log('First post:', posts[0]);
        }
        // Group posts by user
        const userMap = {};
        posts.forEach(post => {
          // Try several possible fields for name
          const name = post.user?.display_name || post.user_name || 'Unknown';
          const lastActive = post.created_at || '';
          const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const avatar = post.user?.avatar_image_url || null;
          if (!userMap[name]) userMap[name] = { name, count: 0, lastActive, initials, avatar };
          userMap[name].count++;
          if (!userMap[name].lastActive || new Date(post.created_at) > new Date(userMap[name].lastActive)) {
            userMap[name].lastActive = post.created_at;
          }
        });
        setUsers(Object.values(userMap).sort((a, b) => b.count - a.count));
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [apiUrl, apiKey, courseId]);

  useEffect(() => {
    if (!apiUrl || !apiKey || !courseId) return;
    async function fetchCourseName() {
      try {
        const res = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}`,
            method: 'GET'
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCourseName(data.name || '');
        } else {
          setCourseName('');
        }
      } catch {
        setCourseName('');
      }
    }
    fetchCourseName();
  }, [apiUrl, apiKey, courseId]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold flex items-center">
              <i className="fas fa-comments mr-2"></i>Canvas Discussions
              <span className="ml-4 text-lg font-normal text-gray-200">{courseName ? courseName : 'Loading...'}</span>
            </h1>
          </div>
          <nav className="flex items-center space-x-4 text-sm">
            <a href="/settings" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-cog mr-1"></i> Settings
            </a>
            <a href="/" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-th-large mr-1"></i> Home
            </a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {credentialsMissing() ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-6 mb-8 rounded">
            <h2 className="text-xl font-bold mb-2">Canvas API Credentials Required</h2>
            <p className="mb-2">To use this app, you must provide your Canvas API URL, Access Token, and Course ID.</p>
            <Link href="/settings" className="text-red-900 underline font-semibold">Go to Settings</Link>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              <button
                className="bg-red-900 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-800 transition-colors"
                onClick={handleDownloadMarkdown}
              >
                Download All Discussions (Markdown)
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p className="text-gray-600 mb-2">
                {/* Optionally show course ID here */}
              </p>
              <p className="text-gray-600 mb-6">View participation across all discussion topics, grouped by user.</p>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800">Users</h2>
                  <span className="bg-red-950 px-3 py-1 rounded-full text-white text-sm font-medium">{filteredUsers.length}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-medium text-gray-700">Users ({filteredUsers.length})</h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#501315] focus:border-transparent"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                    <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                  </div>
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-red-900 font-semibold">Loading users...</div>
                  ) : error ? (
                    <div className="text-red-700 font-semibold">{error}</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-gray-500">No users found.</div>
                  ) : (
                    filteredUsers.map(user => (
                      <Link
                        key={user.name}
                        href={`/user/${encodeURIComponent(user.name)}`}
                        className="block hover:bg-gray-50 rounded-lg p-4 transition-colors duration-150 user-card border border-gray-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-900 font-semibold user-initials">
                                  {user.initials}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate user-name">{user.name}</p>
                              <div className="flex items-center text-xs text-gray-500 mt-1">
                                <span className="mr-3"><i className="fas fa-comment-alt mr-1"></i> {user.count} posts</span>
                                <span><i className="fas fa-clock mr-1"></i> Last active: {user.lastActive ? new Date(user.lastActive).toLocaleString() : 'Never'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-red-900">
                            <i className="fas fa-chevron-right"></i>
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
