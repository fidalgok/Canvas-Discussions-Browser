import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/router';
import { fetchCanvasUserPosts } from '../../js/canvasApi';

export default function UserPage() {
  const router = useRouter();
  const { user_name } = router.query;

  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    setApiUrl(localStorage.getItem('canvas_api_url') || '');
    setApiKey(localStorage.getItem('canvas_api_key') || '');
    setCourseId(localStorage.getItem('course_id') || '');
  }, []);

  // Fetch course name when credentials and courseId are available
  useEffect(() => {
    async function fetchCourseName() {
      if (!apiUrl || !apiKey || !courseId) return;
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

  // Fetch posts and submission status when settings or user_name change
  useEffect(() => {
    if (!user_name || !apiUrl || !apiKey || !courseId) return;
    setLoading(true);
    setError('');
    // Try to extract userId from router query, or fallback to first post
    let userId = undefined;
    if (router.query.user_id) {
      userId = router.query.user_id;
    } else if (posts && posts.length > 0 && posts[0].user_id) {
      userId = posts[0].user_id;
    }
    fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName: user_name, userId })
      .then(async (posts) => {
        // 1. Collect all unique assignment_ids
        const assignmentIds = Array.from(new Set(posts.map(p => p.assignment_id).filter(Boolean)));
        // 2. Fetch all assignments for the course in one batch
        let allAssignments = [];
        try {
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
          if (allAssignRes.ok) {
            allAssignments = await allAssignRes.json();
          }
        } catch {}
        // 3. Map assignment_id to points_possible
        const assignmentsMap = {};
        for (const a of allAssignments) {
          assignmentsMap[a.id] = a;
        }
        // 4. For posts with assignment_id and user_id, fetch submission and attach points_possible
        const updatedPosts = await Promise.all(posts.map(async post => {
          if (post.assignment_id && post.user_id) {
            post.points_possible = assignmentsMap[post.assignment_id]?.points_possible;
            try {
              const subRes = await fetch('/api/canvas-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apiUrl,
                  apiKey,
                  endpoint: `/courses/${courseId}/assignments/${post.assignment_id}/submissions/${post.user_id}`,
                  method: 'GET'
                })
              });
              if (subRes.ok) {
                const submission = await subRes.json();
                post._isUngraded = !submission || submission.grade === null || submission.grade === undefined || submission.grade === '';
              } else {
                post._isUngraded = true;
              }
            } catch {
              post._isUngraded = true;
            }
          }
          return post;
        }));
        setPosts(updatedPosts);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [user_name, apiUrl, apiKey, courseId]);

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
      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center my-12">
            <span className="text-red-900 font-semibold">Loading posts...</span>
          </div>
        ) : error ? (
          <div className="text-red-700 font-semibold my-8">{error}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-3xl font-bold mb-6">Posts by {user_name}</h2>
            {(() => { if (posts.length > 0) { console.log('Sample post:', posts[0]); } })()}
            {(() => { console.log('UserPage posts:', posts.map(p => ({ id: p.id, user_id: p.user_id, user_name: p.user_name, display_name: p.user?.display_name })) ); })()}
            {posts.length === 0 ? (
              <div className="text-gray-500 text-lg">No posts found for this user.</div>
            ) : (
              posts
                .slice()
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((post, idx) => (
                  <div key={idx} className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="font-semibold text-lg mb-1 flex items-center gap-2">
                      {post.topic_title || 'Untitled Topic'}
                      {post.assignment_id && post.user_id && courseId && Number(post.points_possible) >= 1 && (
                        <a
                          href={`https://bostoncollege.instructure.com/courses/${courseId}/gradebook/speed_grader?assignment_id=${post.assignment_id}&student_id=${post.user_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-xs px-2 py-1 rounded transition text-white ${post._isUngraded ? 'bg-red-900 hover:bg-red-800' : 'bg-gray-400 hover:bg-gray-500'}`}
                          title={post._isUngraded ? 'Needs Grading' : 'Graded'}
                        >
                          SpeedGrader
                        </a>
                      )}
                    </div>
                    <div className="text-gray-500 text-xs mb-2">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</div>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.message) }} />
                  </div>
                ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
