/**
 * LazyTopicCard Component - Lazy loading topic card for grading dashboard
 * 
 * Shows topic info immediately, loads grading status on demand to improve initial page load.
 * Future enhancement for very large courses with many topics.
 */

import { useState } from 'react';
import Link from 'next/link';

export default function LazyTopicCard({ topic, className = '', onLoadGradingStatus }) {
  const [gradingStatusLoaded, setGradingStatusLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoadGradingStatus = async () => {
    if (gradingStatusLoaded || loading) return;
    
    setLoading(true);
    try {
      await onLoadGradingStatus(topic.id);
      setGradingStatusLoaded(true);
    } catch (error) {
      console.error('Error loading grading status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${className}`} style={{
      borderColor: 'var(--color-base-300)',
      backgroundColor: 'var(--color-base-100)',
      borderRadius: 'var(--radius-box)'
    }}>
      <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--color-primary)'}}>
        {topic.title}
      </h3>
      
      {/* Teacher Feedback Stats */}
      <div className="mb-4">
        <h4 className="text-lg font-medium mb-2" style={{color: 'var(--color-base-content)'}}>
          Student Posts: {topic.totalStudentPosts || 0} | Teacher Replies: {topic.totalTeacherReplies || 0}
        </h4>
      </div>

      {/* Grading Status Section */}
      {!gradingStatusLoaded ? (
        <div className="mb-4">
          <button
            onClick={handleLoadGradingStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-accent-content)',
              borderRadius: 'var(--radius-field)'
            }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Loading grading status...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Load Grading Status
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Teacher Feedback Stats */}
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2" style={{color: 'var(--color-base-content)'}}>
              Feedback: 
              {Object.keys(topic.teacherReplyStats || {}).length === 0 ? (
                <span className="ml-2" style={{color: 'var(--color-error-content)'}}>No teacher replies yet</span>
              ) : (
                <span className="ml-2">
                  {Object.entries(topic.teacherReplyStats || {}).map(([teacher, count], index) => (
                    <span key={teacher}>
                      {index > 0 && ', '}
                      <span style={{color: 'var(--color-accent)'}}>{teacher}</span> ({count})
                    </span>
                  ))}
                </span>
              )}
            </h4>
          </div>

          {/* Students Needing Grades */}
          {topic.studentsNeedingGrades && topic.studentsNeedingGrades.length > 0 && (
            <div className="mb-4">
              <h4 className="text-lg font-medium mb-2" style={{color: 'var(--color-base-content)'}}>
                Students needing grades ({topic.studentsNeedingGrades.length}):
              </h4>
              <div className="flex flex-wrap gap-2">
                {topic.studentsNeedingGrades.map(studentName => (
                  <Link
                    key={studentName}
                    href={`/user/${encodeURIComponent(studentName)}`}
                    className="inline-block px-3 py-1 text-sm transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: 'var(--color-error)',
                      color: 'var(--color-error-content)',
                      borderRadius: 'var(--radius-selector)'
                    }}
                  >
                    {studentName}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Order Control */}
          <div className="text-sm pt-2" style={{
            color: 'var(--color-base-content-muted)',
            borderTop: 'var(--border) solid var(--color-base-300)'
          }}>
            <span>Students sorted by submission date (oldest first)</span>
          </div>
        </>
      )}
    </div>
  );
}