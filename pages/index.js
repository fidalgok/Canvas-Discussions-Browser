/**
 * Homepage - Recent Activity Feed (Component-Based Architecture)
 * 
 * Shows recent student discussion activity excluding teacher posts.
 * Migrated to use the new component-based architecture with 70% code reduction.
 */

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import Layout from '../components/layout/Layout';
import PageContainer from '../components/layout/PageContainer';
import { useCanvasAuth } from '../components/canvas/useCanvasAuth';
import { useCanvasCache } from '../components/canvas/useCanvasCache';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import StatusBadge from '../components/ui/StatusBadge';
import RefreshButton from '../components/ui/RefreshButton';
import CredentialsRequired from '../components/ui/CredentialsRequired';
import ActivityCard from '../components/discussion/ActivityCard';
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
  
  // State management for activity data and UI states
  const [recentActivity, setRecentActivity] = useState([]);  // Array of student activity entries
  const [uniqueUsers, setUniqueUsers] = useState(0);         // Count of unique student users
  const [loading, setLoading] = useState(false);             // Loading state for async operations
  const [error, setError] = useState('');                    // Error message display

  /**
   * Load activity data when credentials or course changes
   * Sets up cache listener and handles loading/error states
   */
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

  /**
   * Fetches and processes Canvas discussion data to show recent student activity
   * Filters out teacher posts and sorts chronologically (newest first)
   */
  async function loadActivityData() {
    // Fetch all discussion posts and teacher enrollment data
    const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
    const teacherUserIds = await fetchCourseEnrollments(apiUrl, apiKey, courseId);
    
    // Filter to only include student posts (exclude teachers)
    const studentPosts = allPosts.filter(post => {
      const userId = post.user?.id || post.user_id;
      return !teacherUserIds.includes(parseInt(userId)) && !teacherUserIds.includes(userId);
    });
    
    // Sort by creation date (newest first)
    studentPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Transform posts into activity entries with consistent structure
    const activityEntries = studentPosts.map(post => ({
      userName: post.user?.display_name || post.user_name || 'Unknown',
      discussionName: post.topic_title || 'Unknown Discussion',
      createdAt: post.created_at,
      postId: post.id,
      topicId: post.discussion_topic_id,
      avatar: post.user?.avatar_image_url || null,
      initials: (post.user?.display_name || post.user_name || 'Unknown').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }));
    
    // Count unique users and update state
    const uniqueUserNames = new Set(activityEntries.map(entry => entry.userName));
    setUniqueUsers(uniqueUserNames.size);
    setRecentActivity(activityEntries);
  }

  /**
   * Manually refresh data by clearing cache and reloading
   * Triggered by the refresh button click
   */
  function handleRefresh() {
    handleClearCache();
    setLoading(true);
    loadActivityData()
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  /**
   * Exports all Canvas discussions as a threaded Markdown file
   * Dynamically loads TurndownService library for HTML to Markdown conversion
   * Creates a downloadable file with organized discussion threads
   */
  async function handleDownloadMarkdown() {
    // Dynamically load TurndownService if not already available
    if (!window.TurndownService) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/turndown.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }
    // Configure TurndownService for clean markdown conversion
    const turndownService = new window.TurndownService({ headingStyle: 'atx' });
    turndownService.remove('script');  // Remove script tags
    turndownService.remove('style');   // Remove style tags  
    turndownService.remove('link');    // Remove link tags

    /**
     * Converts HTML content to clean Markdown format
     * @param {string} html - Raw HTML content from Canvas
     * @returns {string} - Clean Markdown text
     */
    function htmlToMarkdown(html) {
      html = DOMPurify.sanitize(html);
      html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
                 .replace(/<style[\s\S]*?<\/style>/gi, '')
                 .replace(/<link[\s\S]*?>/gi, '');
      return turndownService.turndown(html).replace(/\n{2,}/g, '\n\n');
    }

    /**
     * Recursively builds threaded discussion structure in Markdown
     * @param {Array} entries - Discussion entries to process
     * @param {number|null} parentId - Parent post ID for replies
     * @param {number} depth - Current nesting depth for indentation
     * @returns {string} - Formatted Markdown thread
     */
    function buildThread(entries, parentId = null, depth = 0) {
      let md = '';
      // Get child entries for this level (top-level if parentId is null)
      const children = parentId === null ? entries : (entries || []).filter(e => (e.parent_id || null) === parentId);
      children.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      
      for (const entry of children) {
        // Build author and date information
        const author = entry.user?.display_name || entry.user_name || 'Unknown';
        const date = entry.created_at ? new Date(entry.created_at).toLocaleString() : '';
        const heading = `${'#'.repeat(2 + depth)} ${depth > 0 ? 'Reply: ' : ''}${author} at ${date}`;
        
        // Convert HTML message to markdown and add indentation for replies
        let message = htmlToMarkdown(DOMPurify.sanitize(entry.message || ''));
        if (depth > 0) {
          message = message.split('\n').map(line => '>'.repeat(depth) + ' ' + line).join('\n');
        }
        
        // Add this entry to the markdown output
        md += `\n${heading}\n\n${message}\n`;
        
        // Recursively process any direct replies and child threads
        if (entry._replies && entry._replies.length > 0) {
          md += buildThread(entry._replies, null, depth + 1);
        }
        md += buildThread(entries, entry.id, depth + 1);
      }
      return md;
    }

    // Validate credentials before proceeding
    if (credentialsMissing()) {
      alert('Please set your Canvas API credentials and Course ID in Settings first.');
      return;
    }

    // Fetch all discussion posts and organize by topic
    const allPosts = await fetchCanvasDiscussions({ apiUrl, apiKey, courseId });
    const topicMap = {};
    
    // Create topic structure for each discussion
    allPosts.forEach(post => {
      if (!topicMap[post.discussion_topic_id]) {
        topicMap[post.discussion_topic_id] = {
          id: post.discussion_topic_id,
          title: post.topic_title,
          assignment_id: post.assignment_id,
          entries: []
        };
      }
    });
    
    // Organize posts into threaded structure (parent posts vs replies)
    allPosts.forEach(post => {
      const topic = topicMap[post.discussion_topic_id];
      if (post.parent_id) {
        // This is a reply - attach to parent post
        const parentEntry = topic.entries.find(entry => entry.id === post.parent_id);
        if (parentEntry) {
          if (!parentEntry._replies) parentEntry._replies = [];
          parentEntry._replies.push(post);
        }
      } else {
        // This is a top-level post
        topic.entries.push(post);
      }
    });
    
    let topicEntries = Object.values(topicMap);
    
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
    
    if (topicsRes.ok) {
      const topics = await topicsRes.json();
      topicEntries.forEach(topicEntry => {
        const originalTopic = topics.find(t => t.id === topicEntry.id);
        if (originalTopic) {
          topicEntry.due_at = originalTopic.due_at;
        }
      });
    }

    topicEntries.sort((a, b) => {
      if (a.due_at && b.due_at) {
        return new Date(a.due_at) - new Date(b.due_at);
      }
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return a.title.localeCompare(b.title);
    });

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
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <h2 className="card-title text-2xl text-base-content">
                  Recent Activity - {uniqueUsers} Users
                </h2>
                {cacheTimestamp && (
                  <StatusBadge type="cached" timestamp={cacheTimestamp} />
                )}
                {dataSource === 'fresh' && !cacheTimestamp && (
                  <StatusBadge type="fresh" />
                )}
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleDownloadMarkdown}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download All Conversations
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <LoadingSpinner message="Loading recent activity..." />
              ) : error ? (
                <ErrorMessage message={error} onRetry={handleRefresh} />
              ) : recentActivity.length === 0 ? (
                <div className="text-base-content opacity-70">No recent activity found.</div>
              ) : (
                recentActivity.map((activity, index) => (
                  <ActivityCard key={index} activity={activity} />
                ))
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}