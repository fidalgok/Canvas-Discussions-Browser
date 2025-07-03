/**
 * Settings Page (/settings) - Component-Based Architecture
 * 
 * Canvas API credentials management and configuration.
 * Migrated to use the new component-based architecture with Layout component.
 */

import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import PageContainer from '../components/layout/PageContainer';
import { useCanvasAuth } from '../components/canvas/useCanvasAuth';
import { useCanvasCourse } from '../components/canvas/useCanvasCourse';
import { clearCache } from '../js/canvasApi';

export default function Settings() {
  const { apiUrl, apiKey, courseId, updateCredentials } = useCanvasAuth();
  const { courseName } = useCanvasCourse();
  
  const [localApiUrl, setLocalApiUrl] = useState('');
  const [localApiKey, setLocalApiKey] = useState('');
  const [localCourseId, setLocalCourseId] = useState('');
  const [saved, setSaved] = useState(false);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    setLocalApiUrl(apiUrl || 'https://bostoncollege.instructure.com/api/v1');
    setLocalApiKey(apiKey);
    setLocalCourseId(courseId);
  }, [apiUrl, apiKey, courseId]);

  function handleSave() {
    updateCredentials(localApiUrl, localApiKey, localCourseId);
    
    // Clear cache when credentials are updated
    if (localCourseId) {
      clearCache(localCourseId);
    }
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleClearCache() {
    if (courseId) {
      clearCache(courseId);
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 3000);
    }
  }

  return (
    <Layout>
      <PageContainer>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Canvas API Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canvas API URL
              </label>
              <input
                type="text"
                value={localApiUrl}
                onChange={(e) => setLocalApiUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                style={{'--tw-ring-color': '#003957'}}
                placeholder="https://yourschool.instructure.com/api/v1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your Canvas instance API URL (usually ends with /api/v1)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Canvas API Access Token
              </label>
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => setLocalApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                style={{'--tw-ring-color': '#003957'}}
                placeholder="Your Canvas API token"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate this in Canvas under Account → Settings → Approved Integrations
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course ID
              </label>
              <input
                type="text"
                value={localCourseId}
                onChange={(e) => setLocalCourseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                style={{'--tw-ring-color': '#003957'}}
                placeholder="12345"
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your Canvas course URL
              </p>
            </div>

            {courseName && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-800">
                  <strong>Connected to:</strong> {courseName}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-4 pt-4">
              <button
                onClick={handleSave}
                className="text-white px-6 py-2 rounded-md font-semibold hover:opacity-90 transition-colors"
                style={{backgroundColor: '#003957'}}
              >
                Save Settings
              </button>
              
              <button
                onClick={handleClearCache}
                className="bg-gray-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-700 transition-colors"
                disabled={!courseId}
              >
                Clear Cache
              </button>

              {saved && (
                <span className="text-green-600 font-medium">Settings saved!</span>
              )}
              
              {cacheCleared && (
                <span className="text-blue-600 font-medium">Cache cleared!</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>1. Get your Canvas API URL:</strong> Usually https://yourschool.instructure.com/api/v1</p>
            <p><strong>2. Generate an API token:</strong> Go to Canvas → Account → Settings → Approved Integrations → New Access Token</p>
            <p><strong>3. Find your Course ID:</strong> Look at your course URL - it's the number after /courses/</p>
            <p><strong>4. Save settings:</strong> Click "Save Settings" to store your credentials locally</p>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}