/**
 * RefreshButton Component - Standardized refresh functionality
 * 
 * Provides consistent refresh button styling and behavior across all pages.
 * Includes loading state and proper accessibility.
 */

export default function RefreshButton({ 
  onRefresh, 
  loading = false, 
  className = '' 
}) {
  return (
    <button
      className={`flex items-center gap-2 bg-gray-600 text-white px-3 py-2 rounded-md font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap ${className}`}
      onClick={onRefresh}
      disabled={loading}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh
    </button>
  );
}