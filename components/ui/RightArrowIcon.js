/**
 * RightArrowIcon Component - Simple right arrow icon
 * 
 * A clean right arrow icon for navigation buttons and links.
 */

export default function RightArrowIcon({ className = "w-4 h-4", ariaLabel = "arrow right" }) {
  return (
    <svg 
      className={className}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label={ariaLabel}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M9 5l7 7-7 7" 
      />
    </svg>
  );
}