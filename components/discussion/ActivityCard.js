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
      className={`card card-compact bg-base-100 hover:bg-base-200 transition-colors duration-150 shadow-sm hover:shadow-md border border-base-300 ${className}`}
    >
      <div className="card-body">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* User avatar or initials circle */}
            <div className="flex-shrink-0">
              {activity.avatar ? (
                <div className="avatar">
                  <div className="w-10 rounded-full">
                    <img 
                      src={activity.avatar} 
                      alt={activity.userName}
                    />
                  </div>
                </div>
              ) : (
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-10">
                    <span className="text-sm font-semibold">{activity.initials}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-base-content">
                <span className="font-medium text-primary">
                  {activity.userName}
                </span>
                {' '}posted to{' '}
                <span className="font-medium text-base-content">{activity.discussionName}</span>
                {' '}at{' '}
                <span className="text-base-content opacity-70">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
          <div className="text-primary">
            <i className="fas fa-chevron-right"></i>
          </div>
        </div>
      </div>
    </Link>
  );
}