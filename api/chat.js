export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed' });
  }

  const { prompt } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'Error: API Key belum dipasang di Vercel.' });
  }

  if (!prompt) {
    return res.status(400).json({ reply: 'Pesan tidak boleh kosong.' });
  }

  try {
    // Gunakan model Flash yang tersedia untuk API key baru; nilainya bisa
    // dioverride dari Environment Variables bila diperlukan.
    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const stream = req.query?.stream === '1';
    const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}`;

    const googleRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (stream && googleRes.ok && googleRes.body) {
      // Teruskan SSE apa adanya. Browser lama tetap bisa membaca responseText
      // secara bertahap lewat XMLHttpRequest.
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      for await (const chunk of googleRes.body) {
        res.write(chunk);
      }
      return res.end();
    }

    const data = await googleRes.json().catch(() => ({}));

    if (!googleRes.ok || data.error) {
      const message = data.error?.message || `Google API mengembalikan status ${googleRes.status}.`;
      // Teruskan status yang bermakna agar kesalahan konfigurasi (401/403),
      // kuota (429), atau model tidak ditemukan (404) tidak terlihat sebagai 500.
      return res.status(googleRes.status || 502).json({ reply: `Google API Error: ${message}` });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons dari model.';
    return res.status(200).json({ reply: replyText });

  } catch (err) {
    return res.status(500).json({ reply: 'Relay server error: ' + err.message });
  }
}
