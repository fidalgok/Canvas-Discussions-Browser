import { useEffect, useState } from 'react';
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

  // Fetch posts when settings or user_name change
  useEffect(() => {
    if (!user_name || !apiUrl || !apiKey || !courseId) return;
    setLoading(true);
    setError('');
    fetchCanvasUserPosts({ apiUrl, apiKey, courseId, userName: user_name })
      .then(setPosts)
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
            {posts.length === 0 ? (
              <div className="text-gray-500 text-lg">No posts found for this user.</div>
            ) : (
              posts
                .slice()
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                .map((post, idx) => (
                  <div key={idx} className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <div className="font-semibold text-lg mb-1">{post.topic_title || 'Untitled Topic'}</div>
                    <div className="text-gray-500 text-xs mb-2">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</div>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: post.message }} />
                  </div>
                ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
