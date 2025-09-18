/**
 * Layout Component - Main page wrapper with header and navigation
 * 
 * Provides consistent page structure across all pages in the application.
 * Includes header, navigation, and content area with proper responsive design.
 */

import Header from './Header';
import Navigation from './Navigation';

export default function Layout({ children, className = '', containerWidth = 'wide' }) {
  // Determine container max-width based on containerWidth prop
  const getContainerClass = () => {
    switch (containerWidth) {
      case 'narrow':
        return 'max-w-3xl';
      case 'wide':
      default:
        return 'max-w-6xl';
    }
  };

  const containerClass = getContainerClass();

  return (
    <div className="min-h-screen">
      {/* Full-width header with centered content */}
      <header className="w-full" style={{backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-content)'}}>
        <div className="max-w-6xl mx-auto px-10 py-4 flex justify-between items-center">
          <Header />
          <Navigation />
        </div>
      </header>
      
      {/* Main content area with configurable max-width and padding */}
      <main className={`${containerClass} mx-auto px-4 py-4 ${className}`}>
        {children}
      </main>
    </div>
  );
}