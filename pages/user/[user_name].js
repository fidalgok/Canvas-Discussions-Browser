import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { useRouter } from "next/router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Layout from "../../components/layout/Layout";
import PageContainer from "../../components/layout/PageContainer";
import { useCanvasAuth } from "../../components/canvas/useCanvasAuth";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import ErrorMessage from "../../components/ui/ErrorMessage";
import CredentialsRequired from "../../components/ui/CredentialsRequired";
import GradedIcon from "../../components/ui/GradedIcon";
import { fetchCanvasUserPosts } from "../../js/canvasApi";

// This component handles the UI and logic for claiming a student
function StudentClaimStatus({ studentId, studentName }) {
  const [facilitatorName, setFacilitatorName] = useState('');

  useEffect(() => {
    const name = localStorage.getItem('facilitator_name') || '';
    setFacilitatorName(name);
  }, []);

  // Skip query if studentId is not yet available
  const status = useQuery(
    api.canvas.getStudentStatus,
    studentId ? { studentId: String(studentId) } : 'skip'
  );

  const setStatus = useMutation(api.canvas.setStudentStatus);

  if (!studentId) {
    return <div className="min-h-[34px]"></div>; // Reserve space while loading studentId
  }

  function handleClaim() {
    if (!facilitatorName) {
      alert('Please set your name in the Settings page to claim students.');
      return;
    }
    setStatus({
      studentId: String(studentId),
      studentName: studentName,
      status: 'claimed',
      facilitatorName: facilitatorName,
    });
  }

  function handleComplete() {
    setStatus({
      studentId: String(studentId),
      studentName: studentName,
      status: 'completed',
      facilitatorName: facilitatorName,
    });
  }

  function handleUnclaim() {
    setStatus({ studentId: String(studentId), studentName: studentName, status: null });
  }

  const renderContent = () => {
    if (status === undefined) {
      return <div className="text-sm text-gray-500">Loading status...</div>;
    }

    if (status === null) {
      return (
        <button onClick={handleClaim} className="px-3 py-1 text-sm font-semibold rounded-md hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-info)', color: 'var(--color-info-content)' }}>
          Claim Student
        </button>
      );
    }

    if (status.status === 'claimed') {
      return (
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-sm font-semibold rounded-md" style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-warning-content)' }}>
            Claimed by: {status.facilitatorName}
          </span>
          {status.facilitatorName === facilitatorName && (
            <>
              <button onClick={handleComplete} className="px-3 py-1 text-sm font-semibold rounded-md hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-success-content)' }}>
                Mark as Complete
              </button>
              <button onClick={handleUnclaim} className="px-3 py-1 text-sm font-semibold rounded-md hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-neutral)', color: 'var(--color-neutral-content)' }}>
                Unclaim
              </button>
            </>
          )}
        </div>
      );
    }

    if (status.status === 'completed') {
      return (
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 text-sm font-semibold rounded-md" style={{ backgroundColor: 'var(--color-success)', color: 'var(--color-success-content)' }}>
            Completed by: {status.facilitatorName}
          </span>
          {status.facilitatorName === facilitatorName && (
            <button onClick={handleUnclaim} className="px-3 py-1 text-sm font-semibold rounded-md hover:opacity-90 transition-opacity" style={{ backgroundColor: 'var(--color-neutral)', color: 'var(--color-neutral-content)' }}>
              Reset Status
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return <div className="min-h-[34px]">{renderContent()}</div>;
}

export default function UserPage() {
  const router = useRouter();
  const { user_name } = router.query;
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();

  const [posts, setPosts] = useState([]);
  const [studentId, setStudentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assignmentsMap, setAssignmentsMap] = useState({});
  const [enhancedUserData, setEnhancedUserData] = useState(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);

  // Group posts by parent_id to organize replies
  const organizePostsAndReplies = (posts) => {
    const topLevelPosts = posts.filter((post) => !post.parent_id);
    const repliesByParentId = {};

    posts
      .filter((post) => post.parent_id)
      .forEach((reply) => {
        if (!repliesByParentId[reply.parent_id]) {
          repliesByParentId[reply.parent_id] = [];
        }
        repliesByParentId[reply.parent_id].push(reply);
      });

    return { topLevelPosts, repliesByParentId };
  };

  // Fetch enhanced user data from Google Sheets
  useEffect(() => {
    if (!user_name || credentialsMissing()) {
      return;
    }

    const googleSheetsId = localStorage.getItem("google_sheets_id");
    const googleApiKey = localStorage.getItem("google_api_key");

    if (googleSheetsId && googleApiKey) {
      setSheetsLoading(true);

      if (typeof window !== "undefined" && !window.googleSheetsApi) {
        const script = document.createElement("script");
        script.src = "/js/googleSheetsApi.js";
        script.onload = () => {
          if (window.googleSheetsApi) {
            fetchEnhancedUserData(googleSheetsId, googleApiKey);
          } else {
            setSheetsLoading(false);
          }
        };
        script.onerror = () => {
          setSheetsLoading(false);
        };
        document.head.appendChild(script);
      } else {
        fetchEnhancedUserData(googleSheetsId, googleApiKey);
      }
    }
  }, [user_name, credentialsMissing]);

  const fetchEnhancedUserData = async (sheetId, apiKey) => {
    try {
      const mockCanvasUser = { display_name: user_name, user_name: user_name };
      const result = await window.googleSheetsApi.fetchAndMatchSheetsData({
        sheetId,
        apiKey,
        canvasUsers: [mockCanvasUser],
        useCache: true,
      });

      if (result.success && result.matchedUsers.length > 0) {
        setEnhancedUserData(result.matchedUsers[0].enhancedData);
      }
    } catch (error) {
      console.error("Failed to fetch enhanced user data:", error);
    } finally {
      setSheetsLoading(false);
    }
  };

  // Fetch posts and submission status when settings or user_name change
  useEffect(() => {
    if (!user_name || credentialsMissing()) return;

    setLoading(true);
    setError("");

    fetchCanvasUserPosts({
      apiUrl,
      apiKey,
      courseId,
      userName: user_name,
      userId: router.query.user_id,
    })
      .then(async (fetchedPosts) => {
        if (fetchedPosts.length > 0 && fetchedPosts[0].user_id) {
          setStudentId(fetchedPosts[0].user_id);
        }

        const assignmentIds = Array.from(
          new Set(fetchedPosts.map((p) => p.assignment_id).filter(Boolean))
        );
        let allAssignments = [];
        try {
          const allAssignRes = await fetch("/api/canvas-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              apiUrl,
              apiKey,
              endpoint: `/courses/${courseId}/assignments?per_page=100`,
              method: "GET",
            }),
          });
          if (allAssignRes.ok) {
            allAssignments = await allAssignRes.json();
          }
        } catch {}
        
        const newAssignmentsMap = {};
        for (const a of allAssignments) {
          newAssignmentsMap[a.id] = a;
        }
        setAssignmentsMap(newAssignmentsMap);

        const updatedPosts = await Promise.all(
          fetchedPosts.map(async (post) => {
            if (post.assignment_id && post.user_id) {
              post.points_possible =
                newAssignmentsMap[post.assignment_id]?.points_possible;
              try {
                const subRes = await fetch("/api/canvas-proxy", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    apiUrl,
                    apiKey,
                    endpoint: `/courses/${courseId}/assignments/${post.assignment_id}/submissions/${post.user_id}`,
                    method: "GET",
                  }),
                });
                if (subRes.ok) {
                  const submission = await subRes.json();
                  post._isUngraded = !submission || submission.grade === null;
                } else {
                  post._isUngraded = true;
                }
              } catch {
                post._isUngraded = true;
              }
            }
            return post;
          })
        );
        setPosts(updatedPosts);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user_name, apiUrl, apiKey, courseId, credentialsMissing, router.query.user_id]);

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
    <Layout>
      <PageContainer>
        <div className="bg-white rounded-lg shadow-md p-9">
          <div className="mb-6 pb-4 border-b border-gray-200">
            <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-primary)" }}>
              {user_name}
            </h1>
            <StudentClaimStatus studentId={studentId} studentName={user_name} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-semibold" style={{ color: "var(--color-primary)" }}>
                    About
                  </h2>
                </div>

                {sheetsLoading && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-blue-600">Loading profile data...</span>
                    </div>
                  </div>
                )}

                {enhancedUserData ? (
                  <div className="space-y-4">
                    {/* ... Enhanced user data fields ... */}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    No additional profile information available.
                  </p>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-2xl font-semibold mb-4" style={{ color: "var(--color-primary)" }}>
                Posts
              </h2>

              {loading ? (
                <LoadingSpinner message="Loading posts..." />
              ) : error ? (
                <ErrorMessage message={error} onRetry={() => window.location.reload()} />
              ) : posts.length === 0 ? (
                <div className="text-gray-500 text-lg">No posts found for this user.</div>
              ) : (
                (() => {
                  const { topLevelPosts, repliesByParentId } = organizePostsAndReplies(posts);
                  return topLevelPosts
                    .slice()
                    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                    .map((post) => (
                      <div key={post.id}>
                        <div className="px-4 my-6" style={{ borderLeft: "3px solid var(--color-secondary)" }}>
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-semibold" style={{ color: "var(--color-primary)" }}>
                              {post.topic_title}
                            </h3>
                            {post.assignment_id && post.user_id && courseId && assignmentsMap[post.assignment_id]?.points_possible > 0 && (
                              <a href={`${apiUrl.replace("/api/v1", "")}courses/${courseId}/gradebook/speed_grader?assignment_id=${post.assignment_id}&student_id=${post.user_id}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2 py-1 uppercase transition hover:opacity-90 flex items-center gap-1" style={{ backgroundColor: post._isUngraded ? 'var(--color-error)' : 'var(--color-success)', color: post._isUngraded ? 'var(--color-error-content)' : 'var(--color-success-content)', borderRadius: 'var(--radius-field)' }} title={post._isUngraded ? 'Grade this assignment in SpeedGrader' : 'View graded assignment in SpeedGrader'}>
                                {!post._isUngraded && <GradedIcon className="w-3 h-3 mr-1" />}
                                <span>{post._isUngraded ? 'Needs Grading' : 'Graded'}</span>
                                <span className="ml-1">→</span>
                              </a>
                            )}
                          </div>
                          <div className="text-gray-500 text-xs mb-2">
                            {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
                          </div>
                          <div className="prose max-w-none mb-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.message) }} />
                        </div>

                        {repliesByParentId[post.id]?.map((reply) => (
                          <div key={reply.id} className="ml-8 border-l-4 pl-4 mb-4" style={{ borderColor: 'var(--color-primary)' }}>
                            {/* ... Reply rendering ... */}
                          </div>
                        ))}
                      </div>
                    ));
                })()
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}
