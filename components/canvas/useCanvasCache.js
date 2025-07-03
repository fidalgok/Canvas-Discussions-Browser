/**
 * useCanvasCache - Custom hook for Canvas data caching
 * 
 * Provides cache management, refresh logic, and cache status indicators.
 * Integrates with existing cache system from canvasApi.js.
 */

import { useState } from 'react';
import { clearCache, getCacheTimestamp } from '../../js/canvasApi';

export function useCanvasCache(courseId) {
  const [dataSource, setDataSource] = useState('');
  const [cacheTimestamp, setCacheTimestamp] = useState(null);

  // Get current cache timestamp
  const updateCacheTimestamp = () => {
    if (courseId) {
      const timestamp = getCacheTimestamp(courseId);
      setCacheTimestamp(timestamp);
    }
  };

  // Clear cache and reset state
  const handleClearCache = () => {
    if (courseId) {
      clearCache(courseId);
      setDataSource('');
      setCacheTimestamp(null);
    }
  };

  // Mark data as fresh
  const markDataFresh = () => {
    setDataSource('fresh');
    updateCacheTimestamp();
  };

  // Mark data as cached
  const markDataCached = () => {
    setDataSource('cached');
    updateCacheTimestamp();
  };

  // Setup console listener for cache detection
  const setupCacheListener = (callback) => {
    const existingTimestamp = getCacheTimestamp(courseId);
    setCacheTimestamp(existingTimestamp);
    
    const originalLog = console.log;
    console.log = function(...args) {
      if (args[0] === '✓ Using cached discussion data') {
        setDataSource('cached');
        setCacheTimestamp(existingTimestamp);
      } else if (args[0] === '→ Fetching fresh discussion data from Canvas API') {
        setDataSource('fresh');
        setCacheTimestamp(null);
      }
      originalLog.apply(console, args);
    };
    
    return () => {
      console.log = originalLog;
    };
  };

  return {
    dataSource,
    cacheTimestamp,
    updateCacheTimestamp,
    handleClearCache,
    markDataFresh,
    markDataCached,
    setupCacheListener,
    isCached: dataSource === 'cached',
    isFresh: dataSource === 'fresh'
  };
}