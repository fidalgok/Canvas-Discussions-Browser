/**
 * TopicCard Component - Discussion topic display for grading dashboard
 * 
 * Shows topic title, teacher feedback stats, and students needing grades.
 * Used in the feedback page grading dashboard.
 */

import Link from 'next/link';

export default function TopicCard({ topic, className = '' }) {
  return (
    <div className={`border border-gray-200 rounded-lg p-6 bg-white ${className}`}>
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
                  <span >{teacher}</span> ({count})
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
                className="inline-block px-3 py-1 rounded-full text-sm transition-colors text-white hover:opacity-80"
                style={{backgroundColor: '#003957'}}
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
  );
}