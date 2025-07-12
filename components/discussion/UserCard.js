/**
 * UserCard Component - User display for users list page
 * 
 * Shows user avatar, name, post count, and grading status.
 * Used in the users page comprehensive list.
 */

import Link from 'next/link';

export default function UserCard({ user, className = '' }) {
  return (
    <li className={`flex items-center justify-between py-3 ${className}`}>
      <div className="flex items-center gap-3">
        {/* User avatar or initials circle */}
        {user.avatar ? (
          <img 
            src={user.avatar} 
            alt={user.name} 
            className="h-10 w-10 rounded-full object-cover" 
          />
        ) : (
          <div className="h-10 w-10 rounded-full flex items-center justify-center font-semibold text-white" style={{backgroundColor: '#003957'}}>
            {user.initials}
          </div>
        )}
        <Link 
          href={`/user/${encodeURIComponent(user.name)}`} 
          className="text-lg font-semibold hover:underline"
          style={{color: '#003957'}}
        >
          {user.name}
        </Link>
        <span className="text-gray-500 text-sm">({user.count} posts)</span>
      </div>
      {user.hasUngraded && (
        <span title="Needs Feedback" className="flex items-center gap-1 text-red-700 font-semibold">
          <i className="fas fa-file-circle-exclamation" style={{ color: '#b91c1c', fontSize: 22 }}></i>
          Needs Grading
        </span>
      )}
    </li>
  );
}