export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pendingWords } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a Japanese language teacher. For each word, return ONLY a JSON array, no markdown.
Each object: "word","reading"(hiragana/katakana, empty if already kana),"meaning"(English 1-5 words),"image_query"(vivid 2-4 word English phrase for photo search),"example_jp","example_en".
Words: ${pendingWords.join(", ")}`,
            }],
          }],
          generationConfig: { maxOutputTokens: 1200 },
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini status:", response.status);
    console.log("Gemini response:", JSON.stringify(data, null, 2)); // ← add this
    return res.status(response.status).json(data);

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}