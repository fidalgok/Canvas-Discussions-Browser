/**
 * CredentialsRequired Component - Settings prompt display
 * 
 * Shows when Canvas API credentials are missing or invalid.
 * Provides consistent messaging and navigation to settings page.
 */

import Link from 'next/link';

export default function CredentialsRequired({ className = '' }) {
  return (
    <div className={`bg-yellow-100 border-l-4 border-yellow-500 text-yellow-900 p-6 mb-8 rounded ${className}`}>
      <h2 className="text-xl font-bold mb-2">Canvas API Credentials Required</h2>
      <p className="mb-2">To use this app, you must provide your Canvas API URL, Access Token, and Course ID.</p>
      <Link href="/settings" className="font-semibold hover:underline" style={{color: '#003957'}}>
        Go to Settings
      </Link>
    </div>
  );
}