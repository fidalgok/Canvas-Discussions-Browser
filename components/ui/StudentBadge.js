/**
 * StudentBadge Component - Accessible student status indicator
 * 
 * Displays student names with appropriate grading status icons and styling.
 * Includes full accessibility support with proper ARIA labels and keyboard navigation.
 */

import Link from 'next/link';
import NeedsGradingIcon from './NeedsGradingIcon';
import GradedIcon from './GradedIcon';

export default function StudentBadge({ 
  studentName, 
  isGraded = false, 
  postDate = null,
  className = '',
  showTooltip = true 
}) {
  const baseClasses = "inline-flex items-center gap-2 px-3 py-1 text-sm font-medium transition-all duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";
  
  // Styling based on grading status
  const statusClasses = isGraded 
    ? "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200" 
    : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100";
  
  const statusStyles = isGraded 
    ? {
        backgroundColor: 'var(--color-base-200)',
        color: 'var(--color-base-content)',
        borderColor: 'var(--color-base-300)',
        borderRadius: 'var(--radius-selector)'
      }
    : {
        backgroundColor: 'var(--color-error)',
        color: 'var(--color-error-content)',
        borderColor: 'var(--color-error)',
        borderRadius: 'var(--radius-selector)'
      };

  // Accessibility labels
  const statusText = isGraded ? 'graded' : 'needs grading';
  const ariaLabel = `${studentName}, ${statusText}${postDate ? `, posted ${new Date(postDate).toLocaleDateString()}` : ''}`;
  const tooltipText = isGraded 
    ? `${studentName} has been graded` 
    : `${studentName} needs grading${postDate ? ` (posted ${new Date(postDate).toLocaleDateString()})` : ''}`;

  return (
    <Link
      href={`/user/${encodeURIComponent(studentName)}`}
      className={`${baseClasses} ${statusClasses} ${className}`}
      style={statusStyles}
      aria-label={ariaLabel}
      title={showTooltip ? tooltipText : undefined}
      role="button"
    >
      {/* Status Icon */}
      <span className="flex-shrink-0" aria-hidden="true">
        {isGraded ? (
          <GradedIcon 
            className="w-4 h-4" 
            ariaLabel={`${studentName} is graded`}
          />
        ) : (
          <NeedsGradingIcon 
            className="w-4 h-4" 
            ariaLabel={`${studentName} needs grading`}
          />
        )}
      </span>

      {/* Student Name */}
      <span className="truncate font-medium">
        {studentName}
      </span>

      {/* Screen reader only status text */}
      <span className="sr-only">
        {statusText}
        {postDate && `, posted on ${new Date(postDate).toLocaleDateString()}`}
      </span>

      {/* Optional post date indicator for needs grading */}
      {!isGraded && postDate && (
        <span 
          className="text-xs opacity-75 ml-1 flex-shrink-0"
          aria-hidden="true"
        >
          {(() => {
            const daysSince = Math.floor((Date.now() - new Date(postDate)) / (1000 * 60 * 60 * 24));
            if (daysSince === 0) return 'today';
            if (daysSince === 1) return '1d ago';
            if (daysSince < 7) return `${daysSince}d ago`;
            return `${Math.floor(daysSince / 7)}w ago`;
          })()}
        </span>
      )}
    </Link>
  );
}

/**
 * StudentBadgeList Component - Container for multiple student badges
 * Provides proper list semantics and spacing
 */
export function StudentBadgeList({ students = [], className = '', emptyMessage = "No students found" }) {
  if (students.length === 0) {
    return (
      <div className={`text-gray-500 text-sm italic ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div 
      className={`flex flex-wrap gap-2 ${className}`}
      role="list"
      aria-label={`${students.length} student${students.length === 1 ? '' : 's'}`}
    >
      {students.map((student, index) => (
        <div key={student.name || index} role="listitem">
          <StudentBadge
            studentName={student.name}
            isGraded={student.isGraded}
            postDate={student.postDate}
          />
        </div>
      ))}
    </div>
  );
}