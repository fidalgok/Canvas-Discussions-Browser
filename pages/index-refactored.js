/**
 * Homepage - Recent Activity Feed (Refactored Version)
 * 
 * Shows recent student discussion activity excluding teacher posts.
 * Demonstrates the new component-based architecture with significantly reduced code duplication.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../components/layout/Layout';
import PageContainer from '../components/layout/PageContainer';
import { useCanvasAuth } from '../components/canvas/useCanvasAuth';
import { useCanvasCache } from '../components/canvas/useCanvasCache';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import StatusBadge from '../components/ui/StatusBadge';
import RefreshButton from '../components/ui/RefreshButton';
import CredentialsRequired from '../components/ui/CredentialsRequired';
import { fetchCanvasDiscussions } from '../js/canvasApi';
import { fetchCourseEnrollments } from '../js/dataUtils';

export default function Home() {
  const { credentialsMissing, apiUrl, apiKey, courseId } = useCanvasAuth();
  const { 
    dataSource, 
    cacheTimestamp, 
    handleClearCache, 
    setupCacheListener 
  } = useCanvasCache(courseId);
  
  const [recentActivity, setRecentActivity] = useState([]);
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (credentialsMissing()) return;
    
    setLoading(true);
    setError('');
    
    const cleanupListener = setupCacheListener();
    
    loadActivityData()
      .catch(e => setError(e.message))
      .finally(() => {
        setLoading(false);
        cleanupListener();
      });
  }, [apiUrl, apiKey, courseId]);

  async function loadActivityData() {
    const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
    const teacherUserIds = await fetchCourseEnrollments(apiUrl, apiKey, courseId);
    
    const studentPosts = allPosts.filter(post => {
      const userId = post.user?.id || post.user_id;
      return !teacherUserIds.includes(parseInt(userId)) && !teacherUserIds.includes(userId);
    });
    
    studentPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    const activityEntries = studentPosts.map(post => ({
      userName: post.user?.display_name || post.user_name || 'Unknown',
      discussionName: post.topic_title || 'Unknown Discussion',
      createdAt: post.created_at,
      postId: post.id,
      topicId: post.discussion_topic_id,
      avatar: post.user?.avatar_image_url || null,
      initials: (post.user?.display_name || post.user_name || 'Unknown').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }));
    
    const uniqueUserNames = new Set(activityEntries.map(entry => entry.userName));
    setUniqueUsers(uniqueUserNames.size);
    setRecentActivity(activityEntries);
  }

  function handleRefresh() {
    handleClearCache();
    setLoading(true);
    loadActivityData()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  if (credentialsMissing()) {
    return (
      <Layout>
        <PageContainer description="Recent student activity across all discussion topics, excluding teacher posts.">
          <CredentialsRequired />
        </PageContainer>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageContainer description="Recent student activity across all discussion topics, excluding teacher posts.">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-semibold text-gray-800">
                Recent Activity - {uniqueUsers} Users
              </h2>
              {cacheTimestamp && (
                <StatusBadge type="cached" timestamp={cacheTimestamp} />
              )}
              {dataSource === 'fresh' && !cacheTimestamp && (
                <StatusBadge type="fresh" />
              )}
            </div>
            <RefreshButton onRefresh={handleRefresh} loading={loading} />
          </div>

          <div className="space-y-4">
            {loading ? (
              <LoadingSpinner message="Loading recent activity..." />
            ) : error ? (
              <ErrorMessage message={error} onRetry={handleRefresh} />
            ) : recentActivity.length === 0 ? (
              <div className="text-gray-500">No recent activity found.</div>
            ) : (
              recentActivity.map((activity, index) => (
                <Link
                  key={index}
                  href={`/user/${encodeURIComponent(activity.userName)}`}
                  className="block hover:bg-gray-50 rounded-lg p-4 transition-colors duration-150 border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {activity.avatar ? (
                          <img src={activity.avatar} alt={activity.userName} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-900 font-semibold">
                            {activity.initials}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium text-red-900">
                            {activity.userName}
                          </span>
                          {' '}posted to{' '}
                          <span className="font-medium text-gray-700">{activity.discussionName}</span>
                          {' '}at{' '}
                          <span className="text-gray-600">{new Date(activity.createdAt).toLocaleString()}</span>
                        </p>
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
      </PageContainer>
    </Layout>
  );
}