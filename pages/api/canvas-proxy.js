/**
 * Canvas API Proxy - Next.js API Route
 * 
 * This proxy route solves CORS issues when making Canvas API requests from the browser.
 * Canvas API has CORS restrictions that prevent direct browser-to-Canvas communication,
 * so all requests are routed through this server-side proxy.
 * 
 * Security Benefits:
 * - Canvas API tokens never exposed to client-side code
 * - All API communication happens server-side
 * - Request/response data properly validated
 * 
 * Usage Pattern:
 * Client → POST /api/canvas-proxy → Canvas API → Response → Client
 * 
 * @param {NextApiRequest} req - Next.js API request object
 * @param {NextApiResponse} res - Next.js API response object
 */
export default async function handler(req, res) {
  // Extract Canvas API request parameters from POST body
  const { endpoint, apiUrl, apiKey, method = 'GET', body } = req.body || {};

  // Validate required parameters for Canvas API request
  if (!endpoint || !apiUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing required parameters: endpoint, apiUrl, and apiKey are required.' });
  }

  try {
    // Construct full Canvas API URL
    const url = `${apiUrl}${endpoint}`;
    
    // Configure fetch options with Canvas API authentication
    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`, // Canvas API requires Bearer token authentication
        'Content-Type': 'application/json',
      },
    };
    
    // Add request body for non-GET requests
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    // Make the actual request to Canvas API
    const canvasRes = await fetch(url, fetchOptions);
    const data = await canvasRes.json();
    
    // Forward Canvas API errors with proper status codes
    if (!canvasRes.ok) {
      return res.status(canvasRes.status).json({ 
        error: data.errors || data.message || 'Canvas API error',
        status: canvasRes.status 
      });
    }
    
    // Forward successful Canvas API response
    res.status(200).json(data);
  } catch (e) {
    // Handle network errors or other unexpected issues
    console.error('Canvas proxy error:', e);
    res.status(500).json({ error: e.message });
  }
}
