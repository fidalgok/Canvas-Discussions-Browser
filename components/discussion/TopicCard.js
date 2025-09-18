/**
 * TopicCard Component - Discussion topic display for grading dashboard
 * 
 * Shows topic title, teacher feedback stats, and students needing grades.
 * Used in the feedback page grading dashboard.
 */

import Link from 'next/link';

export default function TopicCard({ topic, className = '' }) {
  return (
    <div className={`border rounded-lg p-6 mb-4 border rounded-lg shadow-md ${className}`} style={{
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
          Instructor Feedback: 
          {Object.keys(topic.teacherReplyStats).length === 0 ? (
            <span className="ml-2" style={{color: 'var(--color-error-content)'}}>No teacher replies yet</span>
          ) : (
            <span className="ml-2">
              {Object.entries(topic.teacherReplyStats).map(([teacher, count], index) => (
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
      {topic.studentsNeedingGrades.length > 0 && (
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
    </div>
  );
}