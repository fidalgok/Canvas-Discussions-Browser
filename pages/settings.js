import { useState, useEffect } from 'react';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [courseId, setCourseId] = useState('');
  const [courseName, setCourseName] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiUrl(localStorage.getItem('canvas_api_url') || 'https://bostoncollege.instructure.com/api/v1');
    setApiKey(localStorage.getItem('canvas_api_key') || '');
    setCourseId(localStorage.getItem('course_id') || '');
  }, []);

  useEffect(() => {
    async function fetchCourseName() {
      if (!apiUrl || !apiKey || !courseId) return;
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
        }
      } catch {
        setCourseName('');
      }
    }
    fetchCourseName();
  }, [apiUrl, apiKey, courseId]);

  function saveSettings() {
    localStorage.setItem('canvas_api_url', apiUrl);
    localStorage.setItem('canvas_api_key', apiKey);
    localStorage.setItem('course_id', courseId);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-red-900 text-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold flex items-center">
              <a href="/" className="flex items-center hover:text-gray-200 transition-colors">
                <i className="fas fa-comments mr-2"></i>Canvas Discussion Browser
              </a>
              <span className="ml-4 text-lg font-normal text-gray-200">{courseName ? courseName : 'Loading...'}</span>
            </h1>
          </div>
          <nav className="flex items-center space-x-4 text-sm">
            <a href="/" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-home mr-1"></i> Home
            </a>
            <a href="/settings" className="text-white hover:text-gray-200 transition-colors">
              <i className="fas fa-cog mr-1"></i> Settings
            </a>
            <a href="https://github.com/cdil-bc/Canvas-Discussions-Browser" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gray-200 transition-colors">
              <i className="fab fa-github mr-1"></i> GitHub
            </a>
          </nav>
          {saved && <div style={{ color: '#166534', fontWeight: 600 }}>Saved!</div>}
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-3xl font-bold mb-6">Settings</h2>
          <div className="flex flex-col gap-4">
          <label htmlFor="course_id" className="block text-gray-700 font-medium mb-0 mt-4">Course ID</label>
            <input
              id="course_id"
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-900 w-full"
              placeholder="Course ID"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
            />
            <label htmlFor="canvas_api_url" className="block text-gray-700 font-medium mb-0 mt-2">Canvas API URL</label>
            <input
              id="canvas_api_url"
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-900 w-full"
              placeholder="Canvas API URL (e.g. https://school.instructure.com/api/v1)"
              value={apiUrl}
              onChange={e => setApiUrl(e.target.value)}
            />
            <label htmlFor="canvas_api_key" className="block text-gray-700 font-medium mb-0 mt-2">Canvas API Access Token</label>
      
            <input
              id="canvas_api_key"
              className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-900 w-full"
              placeholder="Canvas API Access Token"
              value={apiKey}
              type="password"
              onChange={e => setApiKey(e.target.value)}
            />
            <p><em>How to get an API Access Token: <a class="text-red-900 underline"  href="https://community.canvaslms.com/t5/Canvas-Basics-Guide/How-do-I-manage-API-access-tokens-in-my-user-account/ta-p/615312">Canvas API Documentation</a></em></p>

            <button
              onClick={saveSettings}
              className="bg-red-900 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-800 transition-colors"
            >
              Save Settings
            </button>
            {saved && <div className="text-green-700 font-semibold">Saved!</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
