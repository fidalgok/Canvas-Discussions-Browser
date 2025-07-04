import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import PageContainer from '../../components/layout/PageContainer';
import { useCanvasAuth } from '../../components/canvas/useCanvasAuth';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorMessage from '../../components/ui/ErrorMessage';
import CredentialsRequired from '../../components/ui/CredentialsRequired';
import { fetchCanvasUserPosts } from '../../js/canvasApi';

export default function UserPage() {
  const router = useRouter();
  const { user_name } = router.query;
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignmentsMap, setAssignmentsMap] = useState({});

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
    if (!user_name || credentialsMissing()) return;
    
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
  }, [user_name, apiUrl, apiKey, courseId, credentialsMissing]);

  // Show credentials required page if missing Canvas API settings
  if (credentialsMissing()) {
    return (
      <Layout containerWidth="narrow">
        <PageContainer>
          <CredentialsRequired />
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout containerWidth="narrow">
      <PageContainer>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-3xl font-bold mb-6" style={{color: 'var(--color-primary)'}}>
            Posts by {user_name}
          </h2>
          
          {loading ? (
            <LoadingSpinner message="Loading posts..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={() => window.location.reload()} />
          ) : posts.length === 0 ? (
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
                      <h3 className="text-xl font-semibold" style={{color: 'var(--color-primary)'}}>
                        {post.topic_title}
                      </h3>
                      {post.assignment_id && post.user_id && courseId && assignmentsMap[post.assignment_id]?.points_possible > 0 && (
                        <a
                          href={`https://bostoncollege.instructure.com/courses/${courseId}/gradebook/speed_grader?assignment_id=${post.assignment_id}&student_id=${post.user_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 transition hover:opacity-90"
                          style={{
                            backgroundColor: post._isUngraded ? 'var(--color-error)' : 'var(--color-success)',
                            color: post._isUngraded ? 'var(--color-error-content)' : 'var(--color-success-content)',
                            borderRadius: 'var(--radius-field)'
                          }}
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
                    <div key={reply.id} className="ml-8 border-l-4 pl-4 mb-4" style={{borderColor: 'var(--color-primary)'}}>
                      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="text-sm font-medium" style={{color: 'var(--color-primary)'}}>
                              {reply.user?.display_name || reply.user_name}
                            </span>
                            <span className="text-xs ml-2" style={{color: 'var(--color-neutral-content)'}}>
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
      </PageContainer>
    </Layout>
  );
}
