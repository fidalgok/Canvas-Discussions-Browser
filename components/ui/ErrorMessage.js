/**
 * ErrorMessage Component - Standardized error display
 * 
 * Provides consistent error messaging across the application.
 * Includes proper styling and optional retry functionality.
 */

export default function ErrorMessage({ 
  message, 
  onRetry = null, 
  className = '' 
}) {
  return (
    <div className={`text-red-700 font-semibold ${className}`}>
      {message}
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-4 underline hover:opacity-70 transition-colors"
          style={{color: '#003957'}}
        >
          Try again
        </button>
      )}
    </div>
  );
}