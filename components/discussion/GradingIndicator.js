/**
 * GradingIndicator Component - Shows grading status for users/assignments
 * 
 * Displays visual indicators for grading status with consistent styling.
 * Used across various pages to show assignment completion status.
 */

export default function GradingIndicator({ 
  needsGrading = false, 
  className = '', 
  size = 'default' 
}) {
  if (!needsGrading) return null;

  const sizeClasses = {
    small: 'text-sm',
    default: 'text-base',
    large: 'text-lg'
  };

  const iconSize = {
    small: 18,
    default: 22,
    large: 26
  };

  return (
    <span 
      title="Needs Feedback" 
      className={`flex items-center gap-1 font-semibold ${sizeClasses[size]} ${className}`}
      style={{color: '#d73502'}}
    >
      <i 
        className="fas fa-file-circle-exclamation" 
        style={{ color: '#d73502', fontSize: iconSize[size] }}
      ></i>
      Needs Grading
    </span>
  );
}