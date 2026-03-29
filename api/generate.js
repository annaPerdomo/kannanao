export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pendingWords } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            response_mime_type: "application/json", 
            response_schema: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  word: { type: "string" },
                  reading: { type: "string" },
                  meaning: { type: "string" },
                  image_query: { type: "string" },
                  example_jp: { type: "string" },
                  example_en: { type: "string" }
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
      // If you see "limit: 0" here, please read the "Important Note" below
      console.error("Gemini Error:", JSON.stringify(data, null, 2));
      return res.status(response.status).json(data);
    }

    // Success! JSON mode means no markdown backticks to strip.
    const rawText = data.candidates[0].content.parts[0].text;
    return res.status(200).json(JSON.parse(rawText));

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}