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
      label: 'Needs Feedback',
      count: needsGradingCount,
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
      label: 'All Submissions',
      count: allStudentsCount,
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
    <div className={`rounded-none border-l-4 mt-6 mb-8 ${className}`} style={{
      borderColor: 'var(--color-primary)',
      backgroundColor: 'var(--color-base-100)',
      borderRadius: '0'
    }}>
      {/* Topic Header */}
      <div className="px-6 py-0">
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
                  <span key={teacher} className="inline-flex items-center gap-1 mr-4 ">
                    <span>{teacher}</span>
                    <span 
                      className="inline-flex items-center ml-0.5 px-2 py-0.5 text-xs font-medium rounded-md shadow"
                      style={{
                        backgroundColor: 'oklch(0.600 0.030 239.7)',
                        color: '#fff'
                      }}
                    >
                      {count}
                    </span>
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
      <div className="px-6 py-3 mt-4 text-sm" style={{
        color: 'var(--color-base-content-muted)',
        borderColor: 'var(--color-base-300)',
        backgroundColor: 'transparent',
      }}>
        <div className="flex">
          <div className="flex items-center gap-4 pr-5" >
            <span>Students sorted by submission date (oldest first)</span>
   
          </div>
          <div>
          <span>
            <span className="font-medium">{topic.totalStudentPosts} posts • {topic.totalTeacherReplies} replies</span>
             <span className="font-medium px-2"> | </span>    
             <span>
              <span className="font-medium">{gradedCount} graded</span>
              <span className="mx-2">•</span>
              <span className="font-medium">{needsGradingCount} pending </span>
            </span>
          
          </span>
          </div>
        </div>
      </div>
    </div>
  );
}