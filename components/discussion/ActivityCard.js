/**
 * ActivityCard Component - Individual activity entry for recent activity feed
 * 
 * Displays user avatar, activity details, and clickable navigation to user page.
 * Used in the homepage recent activity list.
 */

import Link from 'next/link';

export default function ActivityCard({ activity, className = '' }) {
  return (
    <Link
      href={`/user/${encodeURIComponent(activity.userName)}`}
      className={`block hover:bg-gray-50 rounded-lg p-4 transition-colors duration-150 border border-gray-200 ${className}`}
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
              <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white" style={{backgroundColor: '#003957'}}>
                {activity.initials}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-900">
              <span className="font-medium" style={{color: '#003957'}}>
                {activity.userName}
              </span>
              {' '}posted to{' '}
              <span className="font-medium text-gray-700">{activity.discussionName}</span>
              {' '}at{' '}
              <span className="text-gray-600">
                {new Date(activity.createdAt).toLocaleString()}
              </span>
            </p>
          </div>
        </div>
        <div style={{color: '#003957'}}>
          <i className="fas fa-chevron-right"></i>
        </div>
      </div>
    </Link>
  );
}