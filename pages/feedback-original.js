import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCanvasDiscussions, clearCache, getCacheTimestamp } from '../js/canvasApi';
import { filterGradedReflections, fetchCourseEnrollments, filterStudentParticipants } from '../js/dataUtils';

export default function Home() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState('');
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // Helper: Check if credentials are set
  function credentialsMissing() {
    return !apiUrl || !apiKey || !courseId;
  }

  useEffect(() => {
    setApiUrl(localStorage.getItem('canvas_api_url') || '');
    setApiKey(localStorage.getItem('canvas_api_key') || '');  
    setCourseId(localStorage.getItem('course_id') || '');
  }, []);

  useEffect(() => {
    if (!apiUrl || !apiKey || !courseId) return;
    setLoading(true);
    setError('');
    setDataSource('');
    
    // Check for existing cache timestamp
    const existingTimestamp = getCacheTimestamp(courseId);
    setCacheTimestamp(existingTimestamp);
    
    // Listen for console messages to detect cache usage
    const originalLog = console.log;
    console.log = function(...args) {
      if (args[0] === '✓ Using cached discussion data') {
        setDataSource('cached');
        setCacheTimestamp(existingTimestamp);
      } else if (args[0] === '→ Fetching fresh discussion data from Canvas API') {
        setDataSource('fresh');
        setCacheTimestamp(null);
      }
      originalLog.apply(console, args);
    };
    
    loadTopicData()
      .catch(e => {
        console.log = originalLog; // Restore original console.log
        setError(e.message);
      })
      .finally(() => {
        console.log = originalLog; // Restore original console.log
        setLoading(false);
      });
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

  async function loadTopicData() {
    // Get all discussion posts
    const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
    
    // Filter to only graded discussions (assignment-based topics)
    const gradedPosts = filterGradedReflections(allPosts);
    
    // Get teacher user IDs to identify teacher replies
    const teacherUserIds = await fetchCourseEnrollments(apiUrl, apiKey, courseId);
    
    // Group posts by discussion topic
    const topicMap = {};
    
    gradedPosts.forEach(post => {
      const topicId = post.discussion_topic_id;
      
      if (!topicMap[topicId]) {
        topicMap[topicId] = {
          id: topicId,
          title: post.topic_title,
          assignment_id: post.assignment_id,
          studentPosts: [],
          teacherReplies: [],
          studentsNeedingGrades: new Set()
        };
      }
      
      const topic = topicMap[topicId];
      const userId = post.user?.id || post.user_id;
      const isTeacher = teacherUserIds.includes(parseInt(userId)) || teacherUserIds.includes(userId);
      
      if (isTeacher) {
        // This is a teacher reply
        topic.teacherReplies.push(post);
      } else {
        // This is a student post - check grading status
        topic.studentPosts.push(post);
        
        const studentName = post.user?.display_name || post.user_name;
        if (studentName) {
          topic.studentsNeedingGrades.add(studentName);
        }
      }
    });

    // Now check grading status for each student post in each topic
    const topicsArray = await Promise.all(Object.values(topicMap).map(async topic => {
      // Count replies by teacher
      const teacherReplyStats = {};
      topic.teacherReplies.forEach(reply => {
        const teacherName = reply.user?.display_name || reply.user_name || 'Unknown Teacher';
        teacherReplyStats[teacherName] = (teacherReplyStats[teacherName] || 0) + 1;
      });

      // Check grading status for student posts
      const studentsNeedingGrades = new Set();
      
      if (topic.assignment_id) {
        // For each student post, check if they have been graded
        const studentPosts = topic.studentPosts.filter(post => !post.parent_id); // Only top-level posts
        
        await Promise.all(studentPosts.map(async post => {
          const studentName = post.user?.display_name || post.user_name;
          const userId = post.user?.id || post.user_id;
          
          if (studentName && userId && topic.assignment_id) {
            try {
              const subRes = await fetch('/api/canvas-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apiUrl,
                  apiKey,
                  endpoint: `/courses/${courseId}/assignments/${topic.assignment_id}/submissions/${userId}`,
                  method: 'GET'
                })
              });
              
              if (subRes.ok) {
                const submission = await subRes.json();
                const isUngraded = !submission || submission.grade === null || submission.grade === undefined || submission.grade === '';
                
                if (isUngraded) {
                  studentsNeedingGrades.add(studentName);
                }
              } else {
                // If we can't fetch submission, assume needs grading
                studentsNeedingGrades.add(studentName);
              }
            } catch {
              // If error fetching, assume needs grading
              studentsNeedingGrades.add(studentName);
            }
          }
        }));
      }

      return {
        ...topic,
        teacherReplyStats,
        studentsNeedingGrades: Array.from(studentsNeedingGrades),
        totalStudentPosts: topic.studentPosts.length,
        totalTeacherReplies: topic.teacherReplies.length
      };
    }));

    // Sort by title
    topicsArray.sort((a, b) => a.title.localeCompare(b.title));
    
    // Update cache timestamp after processing
    const newTimestamp = getCacheTimestamp(courseId);
    setCacheTimestamp(newTimestamp);
    
    setTopics(topicsArray);
  }

  function handleRefreshData() {
    clearCache(courseId);
    setDataSource('');
    setCacheTimestamp(null);
    setLoading(true);
    loadTopicData()
      .then(() => {
        setDataSource('fresh');
        const newTimestamp = getCacheTimestamp(courseId);
        setCacheTimestamp(newTimestamp);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-900 text-white shadow-md mx-auto">
        <div className="container mx-auto max-w-6xl px-4 py-4 flex justify-between items-center">
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
            <a href="/feedback" className="text-white hover:text-gray-200 transition-colors border-b">
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
        <p className="text-gray-600 mb-6 font-bold">Discussion Topics Dashboard - Track grading progress and teacher feedback equity across discussion assignments.</p>
        
        {credentialsMissing() ? (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-6 mb-8 rounded">
            <h2 className="text-xl font-bold mb-2">Canvas API Credentials Required</h2>
            <p className="mb-2">To use this app, you must provide your Canvas API URL, Access Token, and Course ID.</p>
            <Link href="/settings" className="text-red-900 underline font-semibold">Go to Settings</Link>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold text-gray-800">Discussion Topics ({topics.length})</h2>
                  {cacheTimestamp && (
                    <span className="text-sm px-2 py-1 rounded bg-green-100 text-green-800">
                      ⚡ Last refreshed: {new Date(cacheTimestamp).toLocaleString()}
                    </span>
                  )}
                  {dataSource === 'fresh' && !cacheTimestamp && (
                    <span className="text-sm px-2 py-1 rounded bg-blue-100 text-blue-800">
                      🔄 Fresh data
                    </span>
                  )}
                </div>
                <button
                  className="bg-gray-600 text-white px-3 py-2 rounded-md font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap"
                  onClick={handleRefreshData}
                  disabled={loading}
                >
                  🔄 Refresh
                </button>
              </div>

              <div className="space-y-6">
                {loading ? (
                  <div className="text-red-900 font-semibold">Loading topics...</div>
                ) : error ? (
                  <div className="text-red-700 font-semibold">{error}</div>
                ) : topics.length === 0 ? (
                  <div className="text-gray-500">No graded discussion topics found.</div>
                ) : (
                  topics.map(topic => (
                    <div key={topic.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">{topic.title}</h3>
                      
                      {/* Teacher Feedback Stats */}
                      <div className="mb-4">
                        <h4 className="text-lg font-medium text-gray-700 mb-2">
                          Feedback: 
                          {Object.keys(topic.teacherReplyStats).length === 0 ? (
                            <span className="text-red-600 ml-2">No teacher replies yet</span>
                          ) : (
                            <span className="ml-2">
                              {Object.entries(topic.teacherReplyStats).map(([teacher, count], index) => (
                                <span key={teacher}>
                                  {index > 0 && ', '}
                                  {teacher} ({count})
                                </span>
                              ))}
                            </span>
                          )}
                        </h4>
                      </div>

                      {/* Students Needing Grades */}
                      {topic.studentsNeedingGrades.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-lg font-medium text-gray-700 mb-2">
                            Students needing grades ({topic.studentsNeedingGrades.length}):
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {topic.studentsNeedingGrades.map(studentName => (
                              <Link
                                key={studentName}
                                href={`/user/${encodeURIComponent(studentName)}`}
                                className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm hover:bg-red-200 transition-colors"
                              >
                                {studentName}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Stats */}
                      <div className="text-sm text-gray-600 pt-2 border-t">
                        <span className="mr-4">
                          <i className="fas fa-users mr-1"></i>
                          {topic.totalStudentPosts} student posts
                        </span>
                        <span>
                          <i className="fas fa-reply mr-1"></i>
                          {topic.totalTeacherReplies} teacher replies
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}