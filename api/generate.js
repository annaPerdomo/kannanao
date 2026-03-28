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
              text: `You are a Japanese language teacher. Create flashcards for these words: ${pendingWords.join(", ")}. 
              For the "reading" field: use hiragana/katakana. If the word is already kana, leave "reading" empty.
              For "image_query": provide a vivid 2-4 word English phrase for a photo search.`,
            }],
          }],
          generationConfig: {
            maxOutputTokens: 2000,
            responseMimeType: "application/json", 
            responseSchema: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  word: { type: "STRING" },
                  reading: { type: "STRING" },
                  meaning: { type: "STRING" },
                  image_query: { type: "STRING" },
                  example_jp: { type: "STRING" },
                  example_en: { type: "STRING" }
                },
                required: ["word", "reading", "meaning", "image_query", "example_jp", "example_en"]
              }
            }
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error Detail:", data);
      return res.status(response.status).json(data);
    }

    // Success! Return the full data to your frontend
    return res.status(200).json(data);

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}