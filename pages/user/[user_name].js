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
  const [assignmentsMap, setAssignmentsMap] = useState({});

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

  // Group posts by parent_id to organize replies
  const organizePostsAndReplies = (posts) => {
    const topLevelPosts = posts.filter(post => !post.parent_id);
    const repliesByParentId = {};
    
    posts.filter(post => post.parent_id).forEach(reply => {
      if (!repliesByParentId[reply.parent_id]) {
        repliesByParentId[reply.parent_id] = [];
      }
      repliesByParentId[reply.parent_id].push(reply);
    });

    return { topLevelPosts, repliesByParentId };
  };

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
        const newAssignmentsMap = {};
        for (const a of allAssignments) {
          newAssignmentsMap[a.id] = a;
        }
        setAssignmentsMap(newAssignmentsMap);
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
              <a href="/" className="flex items-center hover:text-gray-200 transition-colors">
                <i className="fas fa-comments mr-2"></i>Canvas Discussion Browser
              </a>
              <span className="ml-4 text-lg font-normal text-gray-200">{courseName ? courseName : 'Loading...'}</span>
            </h1>
          </div>
          <nav className="flex items-center space-x-4 text-sm">
            <a href="/" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-home mr-1"></i> Home
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
            {posts.length === 0 ? (
              <div className="text-gray-500 text-lg">No posts found for this user.</div>
            ) : (() => {
              // Organize posts and replies
              const { topLevelPosts, repliesByParentId } = organizePostsAndReplies(posts);
              
              // Sort top-level posts by creation date
              return topLevelPosts
                .slice()
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((post, idx) => (
                  <div key={post.id}>
                    <div className="bg-white rounded-lg shadow-md p-4 mb-4 border border-gray-200">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xl font-semibold">{post.topic_title}</h3>
                        {post.assignment_id && post.user_id && courseId && assignmentsMap[post.assignment_id]?.points_possible > 0 && (
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
                      <div className="text-gray-500 text-xs mb-2">
                        {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
                      </div>
                      <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.message) }} />
                      {post.score !== undefined && (
                        <div className="text-sm text-gray-600">
                          <p>Score: {post.score}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Render replies */}
                    {repliesByParentId[post.id]?.map((reply, replyIdx) => (
                      <div key={reply.id} className="ml-8 border-l-4 border-blue-900 pl-4 mb-4">
                        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <span className="text-sm text-gray-600">{reply.user?.display_name || reply.user_name}</span>
                              <span className="text-xs text-gray-400 ml-2">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: DOMPurify.sanitize(reply.message)
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ));
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
