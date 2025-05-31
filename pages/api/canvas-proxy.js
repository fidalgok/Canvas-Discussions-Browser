// Next.js API route to proxy Canvas API requests and avoid CORS issues
export default async function handler(req, res) {
  const { endpoint, apiUrl, apiKey, method = 'GET', body } = req.body || {};

  if (!endpoint || !apiUrl || !apiKey) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  try {
    const url = `${apiUrl}${endpoint}`;
    const fetchOptions = {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (method !== 'GET' && body) {
      fetchOptions.body = JSON.stringify(body);
    }
    const canvasRes = await fetch(url, fetchOptions);
    const data = await canvasRes.json();
    if (!canvasRes.ok) {
      return res.status(canvasRes.status).json({ error: data.errors || data.message || 'Canvas API error' });
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
