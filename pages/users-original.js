/**
 * Users Page (/users)
 * 
 * Displays a comprehensive list of all students in the course with grading status indicators.
 * Shows user avatars, post counts, last activity, and highlights students who need grading.
 * Includes markdown export functionality for downloading all discussions.
 */

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
  const [allStudents, setAllStudents] = useState([]); // full roster
  const [ungradedMap, setUngradedMap] = useState({}); // user_id: true if has ungraded
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

    async function fetchAll() {
      try {
        // 1. Fetch full roster
        const rosterRes = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}/users?enrollment_type[]=student&per_page=100`,
            method: 'GET'
          })
        });
        const roster = rosterRes.ok ? await rosterRes.json() : [];
        setAllStudents(roster);

        // 2. Fetch all discussion topics
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
        const topics = topicsRes.ok ? await topicsRes.json() : [];
        // Only graded (has assignment_id and points > 0)
        // Fetch all assignments for the course in one call
        const allAssignRes = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}/assignments?per_page=100`,
            method: 'GET'
          })
        });
        let allAssignments = [];
        if (allAssignRes.ok) {
          allAssignments = await allAssignRes.json();
        }
        const assignments = {};
        for (const a of allAssignments) {
          assignments[a.id] = a;
        }
        // Only include topics where assignment.points_possible >= 1
        let gradedTopics = topics
          .filter(t => t.assignment_id && assignments[t.assignment_id] && Number(assignments[t.assignment_id].points_possible) >= 1)
          .map(t => ({ ...t, points_possible: Number(assignments[t.assignment_id].points_possible) }));


        // 3. Fetch all submissions for each graded assignment
        let allSubmissions = [];
        for (const topic of gradedTopics) {
          const subRes = await fetch('/api/canvas-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              apiUrl,
              apiKey,
              endpoint: `/courses/${courseId}/assignments/${topic.assignment_id}/submissions`,
              method: 'GET'
            })
          });
          const subs = subRes.ok ? await subRes.json() : [];
          // Canvas returns as array or object (id=>sub), normalize
          const subList = Array.isArray(subs) ? subs : Object.values(subs);
          allSubmissions = allSubmissions.concat(subList.map(s => ({ ...s, assignment_id: topic.assignment_id })));
        }

        // 4. Build ungraded map: user_id => true if any ungraded
        const ungraded = {};
        for (const student of roster) {
          for (const topic of gradedTopics) {
            const sub = allSubmissions.find(s => s.user_id === student.id && s.assignment_id === topic.assignment_id);
            console.log('DEBUG: Checking ungraded for student', student.id, 'assignment', topic.assignment_id, 'grade:', sub && sub.grade, 'submission:', sub);
            if (sub && (sub.grade === null || sub.grade === undefined || sub.grade === '')) {
              ungraded[student.id] = true;
              break;
            }
          }
        }
        setUngradedMap(ungraded);

        // 5. Group posts by user for last active
        const posts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
        const userMap = {};
        posts.forEach(post => {
          const name = post.user?.display_name || post.user_name || 'Unknown';
          const lastActive = post.created_at || '';
          const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          const avatar = post.user?.avatar_image_url || null;
          const userId = post.user_id || post.user?.id;
          if (!userMap[userId]) userMap[userId] = { name, count: 0, lastActive, initials, avatar, userId };
          userMap[userId].count++;
          if (!userMap[userId].lastActive || new Date(post.created_at) > new Date(userMap[userId].lastActive)) {
            userMap[userId].lastActive = post.created_at;
          }
        });
        setUsers(userMap);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch users or submissions.');
        setLoading(false);
      }
    }
    fetchAll();
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
            <a href="/" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-home mr-1"></i> Home
            </a>
            <a href="/users" className="text-white hover:text-gray-200 transition-colors border-b">
              <i className="fas fa-users mr-1"></i> Users
            </a>
            <a href="/feedback" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-comments mr-1"></i> Feedback
            </a>
            <a href="/settings" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-cog mr-1"></i> Settings
            </a>
            <a href="https://github.com/cdil-bc/Canvas-Discussions-Browser" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
              <i className="fab fa-github mr-1"></i> GitHub
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
                  <span className="bg-red-950 px-3 py-1 rounded-full text-white text-sm font-medium">{allStudents.length}</span>
                </div>
                {loading ? (
                  <div className="text-red-900 font-semibold">Loading users...</div>
                ) : error ? (
                  <div className="text-red-700 font-semibold">{error}</div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-6">Users</h2>
                    <ul className="divide-y divide-gray-200">
                      {allStudents
                        .map(student => {
                          const user = Object.values(users).find(u => u.userId === student.id) || {
                            name: student.name || student.sortable_name || 'Unknown',
                            count: 0,
                            lastActive: '',
                            initials: (student.name || student.sortable_name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
                            avatar: student.avatar_url || null,
                            userId: student.id
                          };
                          return { ...user, hasUngraded: !!ungradedMap[student.id], studentId: student.id };
                        })
                        .sort((a, b) => {
                          // Sort by hasUngraded first, then lastActive desc
                          if (a.hasUngraded && !b.hasUngraded) return -1;
                          if (!a.hasUngraded && b.hasUngraded) return 1;
                          return new Date(b.lastActive || 0) - new Date(a.lastActive || 0);
                        })
                        .map(user => (
                          <li key={user.studentId} className="flex items-center justify-between py-3">
                            <div className="flex items-center gap-3">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-900 font-semibold">
                                  {user.initials}
                                </div>
                              )}
                              <Link href={`/user/${encodeURIComponent(user.name)}`} className="text-lg font-semibold text-red-900 hover:underline">
                                {user.name}
                              </Link>
                              <span className="text-gray-500 text-sm">({user.count} posts)</span>
                            </div>
                            {user.hasUngraded && (
                              <span title="Needs Grading" className="flex items-center gap-1 text-red-700 font-semibold">
                                <i className="fas fa-file-circle-exclamation" style={{ color: '#b91c1c', fontSize: 22 }}></i>
                                Needs Grading
                              </span>
                            )}
                          </li>
                        ))}
                    </ul>
                  </>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
