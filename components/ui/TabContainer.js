/**
 * TabContainer Component - Fully accessible tab interface
 * 
 * Implements WCAG 2.1 AA compliant tab navigation with:
 * - Full keyboard navigation (arrow keys, enter, space)
 * - Screen reader support with proper ARIA attributes
 * - Focus management and high contrast indicators
 */

import { useState, useRef, useEffect } from 'react';

export default function TabContainer({ 
  tabs, 
  defaultTab = 0, 
  onTabChange = () => {}, 
  className = '',
  ariaLabel = "Tab navigation"
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabRefs = useRef([]);
  const tabListRef = useRef(null);

  // Handle tab activation
  const activateTab = (index) => {
    setActiveTab(index);
    onTabChange(index, tabs[index]);
    
    // Announce tab change to screen readers
    const announcement = `Switched to ${tabs[index].label} tab`;
    announceToScreenReader(announcement);
  };

  // Keyboard navigation handler
  const handleKeyDown = (event, index) => {
    let newIndex = index;
    
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activateTab(index);
        return;
      default:
        return;
    }
    
    // Move focus to new tab
    tabRefs.current[newIndex]?.focus();
  };

  // Click handler
  const handleClick = (index) => {
    activateTab(index);
  };

  // Announce changes to screen readers
  const announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // Set up tab refs
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div className={`${className}`}>
      {/* Tab List - Underline Style */}
      <div 
        role="tablist" 
        ref={tabListRef}
        aria-label={ariaLabel}
        className="flex gap-6 border-b border-gray-200 w-fit"
        style={{ borderColor: 'var(--color-base-300)' }}
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id || index}
            ref={el => tabRefs.current[index] = el}
            role="tab"
            aria-selected={activeTab === index}
            aria-controls={`tabpanel-${tab.id || index}`}
            id={`tab-${tab.id || index}`}
            tabIndex={activeTab === index ? 0 : -1}
            className={`
              relative px-1 py-3 text-sm transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              whitespace-nowrap border-b-2 -mb-px
              ${activeTab === index 
                ? 'font-bold border-black' 
                : 'font-normal border-transparent hover:border-gray-300'
              }
            `}
            style={{
              color: activeTab === index ? 'black' : 'var(--color-base-content-muted)',
              borderBottomColor: activeTab === index ? 'black' : 'transparent'
            }}
            onClick={() => handleClick(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            aria-label={`${tab.label}${tab.count !== undefined ? `, ${tab.count} items` : ''}`}
          >
            <div className="flex items-center gap-2">
              {tab.icon && (
                <span className="flex-shrink-0" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              <span>
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1 font-normal">
                    ({tab.count})
                  </span>
                )}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="tab-panels mt-4 w-full">
        {tabs.map((tab, index) => (
          <div
            key={tab.id || index}
            id={`tabpanel-${tab.id || index}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id || index}`}
            hidden={activeTab !== index}
            className={`focus:outline-none ${activeTab === index ? '' : 'sr-only'}`}
            tabIndex={0}
          >
            {activeTab === index && tab.content}
          </div>
        ))}
      </div>

      {/* Screen reader only status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {tabs[activeTab]?.label} tab selected
        {tabs[activeTab]?.count !== undefined && `, showing ${tabs[activeTab].count} items`}
      </div>
    </div>
  );
}