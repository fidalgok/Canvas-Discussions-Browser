import Link from "next/link";
import NeedsGradingIcon from "./NeedsGradingIcon";
import GradedIcon from "./GradedIcon";

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
  claimStatus = null,
  className = "",
  showTooltip = true,
}) {
  const baseClasses =
    "inline-flex items-center gap-2 px-2 py-1 text-sm font-medium transition-all duration-200 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500";

  const isClaimed = claimStatus?.status === "claimed";
  const isCompleted = claimStatus?.status === "completed";

  // Determine styles based on claim status first, then grading status
  let statusStyles;
  if (isClaimed) {
    statusStyles = {
      backgroundColor: "var(--color-warning)",
      color: "var(--color-warning-content)",
      borderColor: "var(--color-warning)",
      borderRadius: "var(--radius-selector)",
    };
  } else if (isCompleted) {
    statusStyles = {
      backgroundColor: "var(--color-success)",
      color: "#000",
      borderColor: "var(--color-base-300)",
      borderRadius: "var(--radius-selector)",
    };
  } else if (isGraded) {
    statusStyles = {
      backgroundColor: "var(--color-success)",
      color: "#000",
      borderColor: "var(--color-base-300)",
      borderRadius: "var(--radius-selector)",
    };
  } else {
    statusStyles = {
      backgroundColor: "var(--color-error)",
      color: "#000",
      borderColor: "var(--color-error)",
      borderRadius: "var(--radius-selector)",
    };
  }

  const teacherInitials = teacherFeedback
    .map(getTeacherInitials)
    .filter(Boolean);
  const hasTeacherFeedback = isGraded && teacherInitials.length > 0;

  // Accessibility labels
  let statusText = isGraded ? "graded" : "needs grading";
  if (isClaimed) {
    statusText = `claimed by ${claimStatus.facilitatorName}`;
  }
  const feedbackText = hasTeacherFeedback
    ? `, feedback from ${teacherFeedback.join(", ")}`
    : "";
  const ariaLabel = `${studentName}, ${statusText}${postDate ? `, posted ${new Date(postDate).toLocaleDateString()}` : ""}${feedbackText}`;
  const tooltipText = isClaimed
    ? `${studentName} is currently claimed by ${claimStatus.facilitatorName}`
    : isGraded
      ? `${studentName} has been graded${feedbackText}`
      : `${studentName} needs grading${postDate ? ` (posted ${new Date(postDate).toLocaleDateString()})` : ""}`;

  return (
    <Link
      href={`/user/${encodeURIComponent(studentName)}`}
      className={`${baseClasses} ${className}`}
      style={statusStyles}
      aria-label={ariaLabel}
      title={showTooltip ? tooltipText : undefined}
      role="button"
    >
      {isGraded && !isClaimed && (
        <span className="flex-shrink-0" aria-hidden="true">
          <GradedIcon
            className="w-4 h-4"
            ariaLabel={`${studentName} is graded`}
          />
        </span>
      )}

      <span className="truncate font-medium">{studentName}</span>

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

      {!isGraded && postDate && !isClaimed && (
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
