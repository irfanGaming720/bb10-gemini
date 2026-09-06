export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed' });
  }

  const { prompt } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ reply: 'Error: API Key belum dipasang di Vercel.' });
  }

  if (!prompt) {
    return res.status(400).json({ reply: 'Pesan tidak boleh kosong.' });
  }

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const googleRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await googleRes.json();

    if (data.error) {
      return res.status(500).json({ reply: 'Google API Error: ' + data.error.message });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons dari model.';
    return res.status(200).json({ reply: replyText });

  } catch (err) {
    return res.status(500).json({ reply: 'Relay server error: ' + err.message });
  }
}