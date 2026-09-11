export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ reply: 'Method not allowed' });
  }

  const { contents, prompt, apiKey: userKey } = req.body || {};
  // Prioritas pakai API Key dari input frontend (BYOK), fallback ke env Vercel bila ada
  const apiKey = userKey || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(400).json({ reply: 'API Key wajib diisi! Masukkan key di menu atas.' });
  }

  // Gunakan riwayat obrolan bila ada, atau susun pesan tunggal bila contents kosong
  let finalContents = contents;
  if (!finalContents || !Array.isArray(finalContents) || finalContents.length === 0) {
    if (!prompt) {
      return res.status(400).json({ reply: 'Pesan tidak boleh kosong.' });
    }
    finalContents = [{ role: 'user', parts: [{ text: prompt }] }];
  }

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    const googleRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: finalContents
      })
    });

    const data = await googleRes.json().catch(() => ({}));

    if (!googleRes.ok || data.error) {
      const message = data.error?.message || `Google API mengembalikan status ${googleRes.status}.`;
      return res.status(googleRes.status || 502).json({ reply: `Google API Error: ${message}` });
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Tidak ada respons dari model.';
    return res.status(200).json({ reply: replyText });

  } catch (err) {
    return res.status(500).json({ reply: 'Relay server error: ' + err.message });
  }
}