export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pendingWords } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a Japanese teacher. Return a JSON array of objects for: ${pendingWords.join(", ")}.
              Fields: "word", "reading" (hiragana), "meaning" (English), "image_query" (vivid search phrase), "example_jp", "example_en".`,
            }],
          }],
          generationConfig: {
            // 2. This forces the model to return valid JSON (no markdown backticks)
            response_mime_type: "application/json",
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data.error);
      return res.status(response.status).json({ error: data.error.message });
    }

    // With JSON mode enabled, you don't need to strip markdown
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}