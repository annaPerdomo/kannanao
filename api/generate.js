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
              text: `You are a Japanese teacher. Return ONLY a valid JSON array of objects (no markdown, no backticks) for: ${pendingWords.join(", ")}.
              
              Each object MUST have:
              "word": the word,
              "reading": hiragana (empty if already kana),
              "meaning": English meaning,
              "image_query": 2-4 word English phrase for photos,
              "example_jp": Japanese sentence,
              "example_en": English translation.`,
            }],
          }],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.1, // Lower temperature makes it follow formatting better
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", data);
      return res.status(response.status).json({ error: data.error?.message || "API Error" });
    }
    
    let rawText = data.candidates[0].content.parts[0].text;
    
    // Remove markdown backticks if the model ignores our 'no markdown' instruction
    const cleanedJson = rawText.replace(/```json|```/g, "").trim();
    
    const parsedData = JSON.parse(cleanedJson);

    return res.status(200).json(parsedData);

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: err.message });
  }
}