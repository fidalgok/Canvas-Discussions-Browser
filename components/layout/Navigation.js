/**
 * Navigation Component - Main app navigation menu
 * 
 * Provides consistent navigation across all pages with active state highlighting.
 * Automatically detects current page and applies appropriate styling.
 */

import { useRouter } from 'next/router';

const navigationItems = [
  { href: '/', icon: 'fas fa-home', label: 'Home' },
  { href: '/feedback', icon: 'fas fa-comments', label: 'Feedback' },
  { href: '/settings', icon: 'fas fa-cog', label: 'Settings' },
  { 
    href: 'https://github.com/cdil-bc/Canvas-Discussions-Browser', 
    icon: 'fab fa-github', 
    label: 'GitHub',
    external: true
  }
];

export default function Navigation() {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <nav className="flex items-center space-x-4 text-sm">
      {navigationItems.map((item) => {
        const isActive = currentPath === item.href;

        if (item.external) {
          return (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors"
              style={{
                color: 'var(--color-primary-content)',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              <i className={`${item.icon} mr-1`}></i> {item.label}
            </a>
          );
        }

        return (
          <a
            key={item.href}
            href={item.href}
            className={`px-3 py-1 transition-colors ${isActive ? 'rounded' : ''}`}
            style={isActive ? {
              backgroundColor: 'var(--color-primary-content)',
              color: 'var(--color-primary)',
              borderRadius: 'var(--radius-field)',
              textDecoration: 'none'
            } : {
              color: 'var(--color-primary-content)',
              textDecoration: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.target.style.opacity = '0.8';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.opacity = '1';
              }
            }}
          >
            <i className={`${item.icon} mr-1`}></i> {item.label}
          </a>
        );
      })}
    </nav>
  );
}