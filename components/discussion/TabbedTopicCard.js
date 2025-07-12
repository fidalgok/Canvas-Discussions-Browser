/**
 * TabbedTopicCard Component - Accessible tabbed interface for grading dashboard
 * 
 * Displays discussion topics with tabbed view:
 * - Tab 1: Students needing grades (red styling + pencil icon)
 * - Tab 2: All students with status indicators (mixed styling)
 */

import { useState } from 'react';
import TabContainer from '../ui/TabContainer';
import { StudentBadgeList } from '../ui/StudentBadge';
import NeedsGradingIcon from '../ui/NeedsGradingIcon';
import GradedIcon from '../ui/GradedIcon';

export default function TabbedTopicCard({ topic, className = '' }) {
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Prepare tab data
  const needsGradingCount = topic.studentsNeedingGrades?.length || 0;
  const allStudentsCount = topic.allStudentsWithStatus?.length || 0;
  const gradedCount = allStudentsCount - needsGradingCount;

  // Prepare student data for tabs
  const needsGradingStudents = (topic.allStudentsWithStatus || [])
    .filter(student => !student.isGraded)
    .map(student => ({
      name: student.name,
      isGraded: false,
      postDate: student.postDate,
      teacherFeedback: student.teacherFeedback
    }));

  const allStudents = (topic.allStudentsWithStatus || [])
    .map(student => ({
      name: student.name,
      isGraded: student.isGraded,
      postDate: student.postDate,
      teacherFeedback: student.teacherFeedback
    }));

  // Tab configuration
  const tabs = [
    {
      id: 'needs-grading',
      label: 'Needs Grading',
      count: needsGradingCount,
      icon: <NeedsGradingIcon className="w-4 h-4" />,
      content: (
        <div>
          <StudentBadgeList
            students={needsGradingStudents}
            emptyMessage="All students have been graded! 🎉"
          />
        </div>
      )
    },
    {
      id: 'all-students',
      label: 'All Students',
      count: allStudentsCount,
      icon: <GradedIcon className="w-4 h-4" />,
      content: (
        <div>
          <StudentBadgeList
            students={allStudents}
            emptyMessage="No students have posted yet."
          />
        </div>
      )
    }
  ];

  const handleTabChange = (index, tab) => {
    setActiveTabIndex(index);
  };

  return (
    <div className={`border rounded-lg shadow-md mb-8 ${className}`} style={{
      borderColor: 'var(--color-base-300)',
      backgroundColor: 'var(--color-base-100)',
      borderRadius: 'var(--radius-box)'
    }}>
      {/* Topic Header */}
      <div className="p-6 pb-0">
        <h3 className="text-xl font-semibold mb-4" style={{color: 'var(--color-primary)'}}>
          {topic.title}
        </h3>
        
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
      </div>

      {/* Tabbed Student Interface */}
      <div className="px-6">
        <TabContainer
          tabs={tabs}
          defaultTab={0}
          onTabChange={handleTabChange}
          ariaLabel={`Student grading view for ${topic.title}`}
          className=""
        />
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 mt-4 text-sm border-t" style={{
        color: 'var(--color-base-content-muted)',
        borderColor: 'var(--color-base-300)',
        backgroundColor: 'var(--color-base-50)'
      }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <span>Students sorted by submission date (oldest first)</span>
            <span>
              <span className="font-medium">{gradedCount} graded</span>
              <span className="mx-2">•</span>
              <span className="font-medium">{needsGradingCount} pending</span>
            </span>
          </div>
          <span>
            {topic.totalStudentPosts} posts • {topic.totalTeacherReplies} replies
          </span>
        </div>
      </div>
    </div>
  );
}