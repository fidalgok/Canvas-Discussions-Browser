/**
 * Layout Component - Main page wrapper with header and navigation
 * 
 * Provides consistent page structure across all pages in the application.
 * Includes header, navigation, and content area with proper responsive design.
 */

import Header from './Header';
import Navigation from './Navigation';

export default function Layout({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-base-200">
      {/* Full-width header with centered content */}
      <header className="bg-primary text-primary-content shadow-lg w-full">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Header />
          <Navigation />
        </div>
      </header>
      
      {/* Main content area with consistent max-width and padding */}
      <main className={`max-w-6xl mx-auto px-4 py-8 ${className}`}>
        {children}
      </main>
    </div>
  );
}