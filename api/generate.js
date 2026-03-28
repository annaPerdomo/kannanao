export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { pendingWords } = req.body;

  try {
    // 1. MUST use v1beta for JSON Schema features
    // 2. We use gemini-1.5-flash-latest to ensure the model is found
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
            // REST API expects snake_case for these specific fields in v1beta
            response_mime_type: "application/json", 
            response_schema: {
              type: "array", // Note: some versions prefer lowercase "array"
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
      console.error("Gemini Error:", JSON.stringify(data, null, 2));
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}