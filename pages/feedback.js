/**
 * Feedback Page (/feedback) - Component-Based Architecture
 * 
 * Discussion Topics Dashboard - Track grading progress and teacher feedback equity.
 * Migrated to use the new component-based architecture with significant code reduction.
 */

import { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import PageContainer from '../components/layout/PageContainer';
import { useCanvasAuth } from '../components/canvas/useCanvasAuth';
import { useCanvasCache } from '../components/canvas/useCanvasCache';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import StatusBadge from '../components/ui/StatusBadge';
import RefreshButton from '../components/ui/RefreshButton';
import CredentialsRequired from '../components/ui/CredentialsRequired';
import TopicCard from '../components/discussion/TopicCard';
import { fetchCanvasDiscussions } from '../js/canvasApi';
import { filterGradedReflections, fetchCourseEnrollments } from '../js/dataUtils';

export default function FeedbackPage() {
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();
  const { 
    dataSource, 
    cacheTimestamp, 
    handleClearCache, 
    setupCacheListener 
  } = useCanvasCache(courseId);
  
  // State management for feedback dashboard data and UI states
  const [topics, setTopics] = useState([]);           // Array of graded discussion topics with analytics
  const [loading, setLoading] = useState(false);     // Loading state for async operations
  const [error, setError] = useState('');            // Error message display

  /**
   * Load feedback dashboard data when credentials or course changes
   * Analyzes graded discussions for teacher feedback patterns and grading status
   */
  useEffect(() => {
    if (credentialsMissing()) return;
    
    setLoading(true);
    setError('');
    
    const cleanupListener = setupCacheListener();
    
    loadTopicData()
      .catch(e => setError(e.message))
      .finally(() => {
        setLoading(false);
        cleanupListener();
      });
  }, [apiUrl, apiKey, courseId]);

  /**
   * Loads and analyzes discussion topic data for feedback dashboard
   * Processes grading status, teacher reply patterns, and student participation
   */
  async function loadTopicData() {
    // Fetch all discussion posts from Canvas
    const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
    
    // Filter to only include graded discussions (assignment-based topics)
    const gradedPosts = filterGradedReflections(allPosts);
    
    // Get teacher user IDs to differentiate teacher replies from student posts
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
        topic.teacherReplies.push(post);
      } else {
        topic.studentPosts.push(post);
        const studentName = post.user?.display_name || post.user_name;
        if (studentName) {
          topic.studentsNeedingGrades.add(studentName);
        }
      }
    });

    // Check grading status for each student post in each topic
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
        const studentPosts = topic.studentPosts.filter(post => !post.parent_id);
        
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
                studentsNeedingGrades.add(studentName);
              }
            } catch {
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
    setTopics(topicsArray);
  }

  /**
   * Manually refresh feedback data by clearing cache and reloading
   * Triggered by the refresh button click
   */
  function handleRefresh() {
    handleClearCache();
    setLoading(true);
    loadTopicData()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  if (credentialsMissing()) {
    return (
      <Layout>
        <PageContainer description="">
          <CredentialsRequired />
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer description="">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold" style={{color: 'var(--color-primary)'}}>
                Discussion Topics ({topics.length})
              </h2>
              {cacheTimestamp && (
                <StatusBadge type="cached" timestamp={cacheTimestamp} />
              )}
              {dataSource === 'fresh' && !cacheTimestamp && (
                <StatusBadge type="fresh" />
              )}
              <button
                className="flex items-center gap-1 text-sm px-2 py-1 font-medium hover:opacity-90 transition-colors"
                style={{
                  backgroundColor: 'var(--color-secondary)',
                  color: 'var(--color-secondary-content)',
                  borderRadius: 'var(--radius-field)'
                }}
                onClick={handleRefresh}
                disabled={loading}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <LoadingSpinner message="Loading topics..." />
            ) : error ? (
              <ErrorMessage message={error} onRetry={handleRefresh} />
            ) : topics.length === 0 ? (
              <div className="text-gray-500">No graded discussion topics found.</div>
            ) : (
              topics.map(topic => (
                <TopicCard key={topic.id} topic={topic} />
              ))
            )}
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}