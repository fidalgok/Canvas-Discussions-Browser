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
        <div className="card bg-base-100 shadow-md">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">Canvas API Settings</h2>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Canvas API URL</span>
                </label>
                <input
                  type="text"
                  value={localApiUrl}
                  onChange={(e) => setLocalApiUrl(e.target.value)}
                  className="input input-bordered focus:input-primary"
                  placeholder="https://yourschool.instructure.com/api/v1"
                />
                <label className="label">
                  <span className="label-text-alt opacity-70">
                    Your Canvas instance API URL (usually ends with /api/v1)
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Canvas API Access Token</span>
                </label>
                <input
                  type="password"
                  value={localApiKey}
                  onChange={(e) => setLocalApiKey(e.target.value)}
                  className="input input-bordered focus:input-primary"
                  placeholder="Your Canvas API token"
                />
                <label className="label">
                  <span className="label-text-alt opacity-70">
                    Generate this in Canvas under Account → Settings → Approved Integrations
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Course ID</span>
                </label>
                <input
                  type="text"
                  value={localCourseId}
                  onChange={(e) => setLocalCourseId(e.target.value)}
                  className="input input-bordered focus:input-primary"
                  placeholder="12345"
                />
                <label className="label">
                  <span className="label-text-alt opacity-70">
                    Found in your Canvas course URL
                  </span>
                </label>
              </div>

              {courseName && (
                <div className="alert alert-success">
                  <span><strong>Connected to:</strong> {courseName}</span>
                </div>
              )}

              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={handleSave}
                  className="btn btn-primary"
                >
                  Save Settings
                </button>
                
                <button
                  onClick={handleClearCache}
                  className="btn btn-secondary"
                  disabled={!courseId}
                >
                Clear Cache
              </button>

                {saved && (
                  <span className="text-success font-medium">Settings saved!</span>
                )}
                
                {cacheCleared && (
                  <span className="text-info font-medium">Cache cleared!</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-info">
          <div className="card-body">
            <h3 className="card-title text-info-content">Setup Instructions</h3>
            <div className="text-sm text-info-content space-y-2">
              <p><strong>1. Get your Canvas API URL:</strong> Usually https://yourschool.instructure.com/api/v1</p>
              <p><strong>2. Generate an API token:</strong> Go to Canvas → Account → Settings → Approved Integrations → New Access Token</p>
              <p><strong>3. Find your Course ID:</strong> Look at your course URL - it's the number after /courses/</p>
              <p><strong>4. Save settings:</strong> Click "Save Settings" to store your credentials locally</p>
            </div>
          </div>
        </div>
      </PageContainer>
    </Layout>
  );
}