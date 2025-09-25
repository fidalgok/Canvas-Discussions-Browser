/**
 * StudentBadge Component - Accessible student status indicator
 *
 * Displays student names with appropriate grading status icons and styling.
 * Includes full accessibility support with proper ARIA labels and keyboard navigation.
 */

import Link from "next/link";
import NeedsGradingIcon from "./NeedsGradingIcon";
import GradedIcon from "./GradedIcon";

/**
 * Extract initials from teacher names
 * @param {string} name - Full name (e.g., "John Smith")
 * @returns {string} Initials (e.g., "JS")
 */
function getTeacherInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function StudentBadge({
  studentName,
  isGraded = false,
  postDate = null,
  teacherFeedback = [],
  className = "",
  showTooltip = true,
  claimStatus = null,
}) {
  const baseClasses =
    "inline-flex items-center gap-2 px-2 py-1 text-sm font-medium transition-all duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

  // Styling based on grading status
  const statusClasses = isGraded
    ? "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
    : "bg-red-50 text-red-800 border border-red-200 hover:bg-red-100";

  const claimStatusStyles =
    (claimStatus && claimStatus.status) === "claimed"
      ? "var(--color-info)"
      : (claimStatus && claimStatus.status) === "completed"
        ? "var(--color-success)"
        : "var(--color-error)";

  const statusStyles = isGraded
    ? {
        backgroundColor: "var(--color-success)",
        color: "#000",
        borderColor: "var(--color-base-300)",
        borderRadius: "var(--radius-selector)",
      }
    : {
        backgroundColor: claimStatusStyles,
        color: "#000",
        borderColor: claimStatusStyles,
        borderRadius: "var(--radius-selector)",
      };

  // Teacher feedback processing
  const teacherInitials = teacherFeedback
    .map(getTeacherInitials)
    .filter(Boolean);
  const hasTeacherFeedback = isGraded && teacherInitials.length > 0;

  // Debug: Log teacher feedback data
  if (teacherFeedback && teacherFeedback.length > 0) {
    console.log(
      `🎯 StudentBadge ${studentName}: feedback=${JSON.stringify(teacherFeedback)}, initials=${JSON.stringify(teacherInitials)}, hasTeacherFeedback=${hasTeacherFeedback}`
    );
  }

  // Accessibility labels
  const statusText = isGraded ? "graded" : "needs grading";
  const feedbackText = hasTeacherFeedback
    ? `, feedback from ${teacherFeedback.join(", ")}`
    : "";
  const ariaLabel = `${studentName}, ${statusText}${postDate ? `, posted ${new Date(postDate).toLocaleDateString()}` : ""}${feedbackText}`;
  const tooltipText = isGraded
    ? `${studentName} has been graded${feedbackText}`
    : `${studentName} needs grading${postDate ? ` (posted ${new Date(postDate).toLocaleDateString()})` : ""}`;

  return (
    <Link
      href={`/user/${encodeURIComponent(studentName)}`}
      className={`${baseClasses} ${statusClasses} ${claimStatusStyles} ${className}`}
      style={statusStyles}
      aria-label={ariaLabel}
      title={showTooltip ? tooltipText : undefined}
      role="button"
    >
      {/* Status Icon - Only show for graded students */}
      {isGraded && (
        <span className="flex-shrink-0" aria-hidden="true">
          <GradedIcon
            className="w-4 h-4"
            ariaLabel={`${studentName} is graded`}
          />
        </span>
      )}

      {/* Student Name */}
      <span className="truncate font-medium">{studentName}</span>

      {/* Teacher Initials Badge (for graded students with feedback) */}
      {hasTeacherFeedback && (
        <span
          className="inline-flex items-center gap-2 px-2 text-xs font-medium bg-white text-gray-700 rounded-md border border-gray-200"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-base-content-muted)",
            fontSize: "0.75rem",
            borderColor: "transparent",
          }}
          aria-hidden="true"
          title={`Feedback from: ${teacherFeedback.join(", ")}`}
        >
          {teacherInitials.join(", ")}
        </span>
      )}

      {/* Screen reader only status text */}
      <span className="sr-only">
        {statusText}
        {postDate && `, posted on ${new Date(postDate).toLocaleDateString()}`}
        {hasTeacherFeedback && `, feedback from ${teacherFeedback.join(", ")}`}
      </span>

      {/* Days ago badge for needs grading students */}
      {!isGraded && postDate && (
        <span
          className="inline-flex items-center px-2 text-xs font-medium rounded-md"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-error-content)",
          }}
          aria-hidden="true"
          title={`Posted ${new Date(postDate).toLocaleDateString()}`}
        >
          {(() => {
            const daysSince = Math.floor(
              (Date.now() - new Date(postDate)) / (1000 * 60 * 60 * 24)
            );
            if (daysSince === 0) return "today";
            if (daysSince === 1) return "1d ago";
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
export function StudentBadgeList({
  students = [],
  className = "",
  emptyMessage = "No students found",
}) {
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
      aria-label={`${students.length} student${students.length === 1 ? "" : "s"}`}
    >
      {students.map((student, index) => (
        <div key={student.name || index} role="listitem">
          <StudentBadge
            studentName={student.name}
            isGraded={student.isGraded}
            postDate={student.postDate}
            teacherFeedback={student.teacherFeedback}
            claimStatus={student.claimStatus}
          />
        </div>
      ))}
    </div>
  );
}
