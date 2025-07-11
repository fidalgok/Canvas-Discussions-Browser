/**
 * Shared Data Processing Utility for Canvas Grading Dashboard
 * 
 * Optimizes API calls and data processing for both homepage activity feed
 * and grading dashboard to reduce redundant Canvas API requests.
 */

import { fetchCanvasDiscussions } from './canvasApi';
import { fetchCourseEnrollments } from './dataUtils';

/**
 * Batch fetch assignment submissions for multiple assignments
 * Replaces individual submission API calls with efficient batch requests
 * 
 * @param {Object} params - API parameters
 * @param {string} params.apiUrl - Canvas API base URL
 * @param {string} params.apiKey - Canvas API access token
 * @param {string} params.courseId - Canvas course ID
 * @param {Array} assignmentIds - Array of assignment IDs to fetch submissions for
 * @returns {Promise<Object>} Map of assignment_id -> submissions array
 */
async function fetchAssignmentSubmissionsBatch({ apiUrl, apiKey, courseId }, assignmentIds) {
  const submissionsByAssignment = {};
  
  // Fetch submissions for each assignment in parallel
  await Promise.all(assignmentIds.map(async (assignmentId) => {
    try {
      let allSubmissions = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}/assignments/${assignmentId}/submissions?per_page=100&page=${page}`,
            method: 'GET'
          })
        });
        
        if (response.ok) {
          const submissions = await response.json();
          allSubmissions = allSubmissions.concat(submissions);
          hasMore = submissions.length === 100;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      submissionsByAssignment[assignmentId] = allSubmissions;
      console.log(`✓ Fetched ${allSubmissions.length} submissions for assignment ${assignmentId}`);
    } catch (error) {
      console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
      submissionsByAssignment[assignmentId] = [];
    }
  }));
  
  return submissionsByAssignment;
}

/**
 * Process Canvas data for both homepage activity and grading dashboard
 * Single source of truth for Canvas data processing with optimized API usage
 * 
 * @param {Object} params - API parameters
 * @param {string} params.apiUrl - Canvas API base URL
 * @param {string} params.apiKey - Canvas API access token
 * @param {string} params.courseId - Canvas course ID
 * @returns {Promise<Object>} Processed data for both views
 */
export async function processCanvasDataForDashboards({ apiUrl, apiKey, courseId }) {
  const startTime = performance.now();
  console.log('🚀 OPTIMIZATION ACTIVE: Processing Canvas data for dashboards (NEW CODE PATH)');
  
  // Check for cached processed data
  const processingCacheKey = `canvas_processed_${courseId}`;
  const cached = localStorage.getItem(processingCacheKey);
  
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      console.log('✓ Using cached processed dashboard data', new Date(timestamp));
      return data;
    } catch (error) {
      localStorage.removeItem(processingCacheKey);
    }
  }
  
  // Fetch all Canvas data in parallel
  const [allPosts, teacherUserIds] = await Promise.all([
    fetchCanvasDiscussions({ apiUrl, apiKey, courseId }),
    fetchCourseEnrollments(apiUrl, apiKey, courseId)
  ]);
  
  // Filter student posts (exclude teachers)
  const studentPosts = allPosts.filter(post => {
    const userId = post.user?.id || post.user_id;
    return !teacherUserIds.includes(parseInt(userId)) && !teacherUserIds.includes(userId);
  });
  
  // Process recent activity data for homepage
  const recentActivityData = processRecentActivity(studentPosts);
  
  // Process grading topics data for feedback dashboard
  const gradingTopicsData = await processGradingTopics(allPosts, teacherUserIds, { apiUrl, apiKey, courseId });
  
  const processedData = {
    recentActivity: recentActivityData,
    gradingTopics: gradingTopicsData,
    lastProcessed: Date.now()
  };
  
  // Cache the processed data
  localStorage.setItem(processingCacheKey, JSON.stringify({
    data: processedData,
    timestamp: Date.now()
  }));
  
  const processingTime = Math.round(performance.now() - startTime);
  console.log('✓ Processed Canvas data for dashboards', {
    recentPosts: recentActivityData.activities.length,
    gradingTopics: gradingTopicsData.length,
    uniqueUsers: recentActivityData.uniqueUsers,
    processingTime: `${processingTime}ms`
  });
  
  return processedData;
}

/**
 * Process recent activity data for homepage
 * Transforms student posts into activity feed format
 * 
 * @param {Array} studentPosts - Filtered student posts
 * @returns {Object} Recent activity data
 */
function processRecentActivity(studentPosts) {
  // Sort by creation date (newest first)
  studentPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
  // Transform posts into activity entries
  const activities = studentPosts.map(post => ({
    userName: post.user?.display_name || post.user_name || 'Unknown',
    discussionName: post.topic_title || 'Unknown Discussion',
    createdAt: post.created_at,
    postId: post.id,
    topicId: post.discussion_topic_id,
    avatar: post.user?.avatar_image_url || null,
    initials: (post.user?.display_name || post.user_name || 'Unknown')
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }));
  
  // Count unique users
  const uniqueUserNames = new Set(activities.map(activity => activity.userName));
  
  return {
    activities,
    uniqueUsers: uniqueUserNames.size
  };
}

/**
 * Process grading topics data for feedback dashboard
 * Optimized with batch submission fetching and proper sorting
 * 
 * @param {Array} allPosts - All discussion posts
 * @param {Array} teacherUserIds - Array of teacher user IDs
 * @param {Object} apiParams - API parameters for submission fetching
 * @returns {Promise<Array>} Processed grading topics
 */
async function processGradingTopics(allPosts, teacherUserIds, { apiUrl, apiKey, courseId }) {
  // Filter to only graded discussions (assignment-based topics)
  const gradedPosts = allPosts.filter(post => {
    return post.assignment_id !== null && post.assignment_id !== undefined;
  });
  
  // Group posts by discussion topic
  const topicMap = {};
  const assignmentIds = new Set();
  
  gradedPosts.forEach(post => {
    const topicId = post.discussion_topic_id;
    const assignmentId = post.assignment_id;
    
    if (!topicMap[topicId]) {
      topicMap[topicId] = {
        id: topicId,
        title: post.topic_title,
        assignment_id: assignmentId,
        studentPosts: [],
        teacherReplies: []
      };
    }
    
    if (assignmentId) {
      assignmentIds.add(assignmentId);
    }
    
    const topic = topicMap[topicId];
    const userId = post.user?.id || post.user_id;
    const isTeacher = teacherUserIds.includes(parseInt(userId)) || teacherUserIds.includes(userId);
    
    if (isTeacher) {
      topic.teacherReplies.push(post);
    } else {
      topic.studentPosts.push(post);
    }
  });
  
  // Batch fetch all assignment submissions
  console.log(`→ Batch fetching submissions for ${assignmentIds.size} assignments:`, Array.from(assignmentIds));
  const submissionsByAssignment = await fetchAssignmentSubmissionsBatch(
    { apiUrl, apiKey, courseId }, 
    Array.from(assignmentIds)
  );
  
  // Process topics with batch submission data
  const topicsArray = Object.values(topicMap).map(topic => {
    // Count teacher replies by teacher
    const teacherReplyStats = {};
    topic.teacherReplies.forEach(reply => {
      const teacherName = reply.user?.display_name || reply.user_name || 'Unknown Teacher';
      teacherReplyStats[teacherName] = (teacherReplyStats[teacherName] || 0) + 1;
    });
    
    // Check grading status using batch submission data
    const studentsNeedingGrades = [];
    const submissions = submissionsByAssignment[topic.assignment_id] || [];
    
    // Create a map of user_id -> submission for quick lookup
    const submissionByUserId = {};
    submissions.forEach(submission => {
      submissionByUserId[submission.user_id] = submission;
    });
    
    // Check each student post against submissions
    const studentMainPosts = topic.studentPosts.filter(post => !post.parent_id);
    
    studentMainPosts.forEach(post => {
      const studentName = post.user?.display_name || post.user_name;
      const userId = post.user?.id || post.user_id;
      
      if (studentName && userId) {
        const submission = submissionByUserId[userId];
        const isUngraded = !submission || 
                          submission.grade === null || 
                          submission.grade === undefined || 
                          submission.grade === '';
        
        if (isUngraded) {
          studentsNeedingGrades.push({
            name: studentName,
            userId: userId,
            postDate: post.created_at,
            postId: post.id
          });
        }
      }
    });
    
    // Sort students needing grades by post date (oldest first)
    studentsNeedingGrades.sort((a, b) => new Date(a.postDate) - new Date(b.postDate));
    
    return {
      ...topic,
      teacherReplyStats,
      studentsNeedingGrades: studentsNeedingGrades.map(student => student.name),
      studentsNeedingGradesDetailed: studentsNeedingGrades, // Keep detailed info for sorting
      totalStudentPosts: topic.studentPosts.length,
      totalTeacherReplies: topic.teacherReplies.length
    };
  });
  
  // Sort topics by title
  topicsArray.sort((a, b) => a.title.localeCompare(b.title));
  
  return topicsArray;
}

/**
 * Clear processed data cache
 * Use when you want to force fresh processing
 * 
 * @param {string} courseId - Canvas course ID
 */
export function clearProcessedDataCache(courseId) {
  const processingCacheKey = `canvas_processed_${courseId}`;
  localStorage.removeItem(processingCacheKey);
  console.log('✓ Cleared processed data cache for course', courseId);
}