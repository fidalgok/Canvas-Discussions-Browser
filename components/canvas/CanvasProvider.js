/**
 * CanvasProvider - React Context Provider for Canvas API Integration
 * 
 * Manages Canvas API credentials, course data, and shared state across all pages.
 * Provides centralized credential management, course name fetching, and validation.
 */

import { createContext, useContext, useEffect, useState } from 'react';

const CanvasContext = createContext();

export function CanvasProvider({ children }) {
  // Canvas API credential state
  const [apiUrl, setApiUrl] = useState('');           // Canvas instance URL
  const [apiKey, setApiKey] = useState('');           // Canvas API access token
  const [courseId, setCourseId] = useState('');       // Current course ID
  
  // Course information state
  const [courseName, setCourseName] = useState('');   // Fetched course name
  const [courseLoading, setCourseLoading] = useState(false); // Course fetch loading state
  const [courseError, setCourseError] = useState(''); // Course fetch error state

  /**
   * Load stored credentials from sessionStorage on component mount
   * Restores user's Canvas API settings for current session only
   * SECURITY: Using sessionStorage instead of localStorage for better security
   */
  useEffect(() => {
    setApiUrl(sessionStorage.getItem('canvas_api_url') || '');
    setApiKey(sessionStorage.getItem('canvas_api_key') || '');
    setCourseId(sessionStorage.getItem('course_id') || '');
  }, []);

  /**
   * Fetch course information when credentials change
   * Validates credentials and retrieves course name for display
   */
  useEffect(() => {
    if (!apiUrl || !apiKey || !courseId) {
      setCourseName('');
      return;
    }

    /**
     * Fetches course details from Canvas API
     * Updates course name state or sets error on failure
     */
    async function fetchCourseName() {
      setCourseLoading(true);
      setCourseError('');
      
      try {
        const res = await fetch('/api/canvas-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiUrl,
            apiKey,
            endpoint: `/courses/${courseId}`,
            method: 'GET'
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          setCourseName(data.name || '');
        } else {
          setCourseName('');
          setCourseError('Failed to fetch course information');
        }
      } catch (error) {
        setCourseName('');
        setCourseError('Error connecting to Canvas API');
      } finally {
        setCourseLoading(false);
      }
    }
    
    fetchCourseName();
  }, [apiUrl, apiKey, courseId]);

  // Check if credentials are missing
  const credentialsMissing = () => {
    return !apiUrl || !apiKey || !courseId;
  };

  // Update credentials (used by settings page)
  const updateCredentials = (newApiUrl, newApiKey, newCourseId) => {
    setApiUrl(newApiUrl);
    setApiKey(newApiKey);
    setCourseId(newCourseId);
    
    // Update sessionStorage for better security
    sessionStorage.setItem('canvas_api_url', newApiUrl);
    sessionStorage.setItem('canvas_api_key', newApiKey);
    sessionStorage.setItem('course_id', newCourseId);
  };

  const value = {
    // Credentials
    apiUrl,
    apiKey,
    courseId,
    updateCredentials,
    credentialsMissing,
    
    // Course data
    courseName,
    courseLoading,
    courseError,
    
    // Canvas API helper
    makeCanvasRequest: async (endpoint, method = 'GET', body = null) => {
      const response = await fetch('/api/canvas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl,
          apiKey,
          endpoint,
          method,
          body
        })
      });
      
      if (!response.ok) {
        throw new Error(`Canvas API request failed: ${response.statusText}`);
      }
      
      return response.json();
    }
  };

  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
}

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
}