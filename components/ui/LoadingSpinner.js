/**
 * LoadingSpinner Component - Consistent loading state indicator
 * 
 * Provides standardized loading display with Canvas branding colors.
 * Can be used across all pages for consistent user experience.
 */

export default function LoadingSpinner({ message = 'Loading...', className = '' }) {
  return (
    <div className={`font-semibold ${className}`} style={{color: '#003957'}}>
      {message}
    </div>
  );
}