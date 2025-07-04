/**
 * ActivityCard Component - Individual activity entry for recent activity feed
 * 
 * Displays user avatar, activity details, and clickable navigation to user page.
 * Used in the homepage recent activity list.
 */

import Link from 'next/link';

export default function ActivityCard({ activity, enhancedData = null, className = '' }) {
  return (
    <Link
      href={`/user/${encodeURIComponent(activity.userName)}`}
      className={`block rounded-lg p-4 transition-colors duration-150 border ${className}`}
      style={{
        backgroundColor: 'var(--color-base-100)',
        borderColor: 'var(--color-base-300)',
        borderRadius: 'var(--radius-box)'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--color-base-200)'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--color-base-100)'}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* User avatar or initials circle */}
          <div className="flex-shrink-0">
            {activity.avatar ? (
              <img 
                src={activity.avatar} 
                alt={activity.userName} 
                className="h-10 w-10 rounded-full object-cover" 
              />
            ) : (
              <div 
                className="h-10 w-10 rounded-full flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-primary-content)'
                }}
              >
                {activity.initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium" style={{color: 'var(--color-primary)'}}>
                {activity.userName}
              </span>
              {enhancedData && (
                <div className="flex items-center gap-1">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{
                    backgroundColor: 'var(--color-success)',
                    color: 'var(--color-success-content)'
                  }}>
                    📊
                  </span>
                  {enhancedData.institution && (
                    <span className="text-xs text-gray-600">{enhancedData.institution}</span>
                  )}
                  {enhancedData.assistantType && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{
                      backgroundColor: 'var(--color-secondary)',
                      color: 'var(--color-secondary-content)'
                    }}>
                      {enhancedData.assistantType}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="text-sm text-black">
              Posted to{' '}
              <span className="font-medium text-black">
                {activity.discussionName}
              </span>
              {' '}at{' '}
              <span className="text-black">
                {new Date(activity.createdAt).toLocaleString()}
              </span>
            </p>
          </div>
        </div>
        <div style={{color: 'var(--color-primary)'}}>
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>
    </Link>
  );
}