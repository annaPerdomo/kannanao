import { NextRequest, NextResponse } from "next/server";

interface GeneratePayload {
  pendingWords: string[];
}

interface GeneratedCard {
  word: string;
  reading: string;
  meaning: string;
  image_query: string;
  example_jp: string;
  example_en: string;
}

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { pendingWords } = (await req.json()) as GeneratePayload;

  if (!pendingWords?.length) {
    return NextResponse.json({ error: "No words provided" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  try {
    const prompt = `Japanese language teacher. Create exactly one card per word for: ${pendingWords.join(", ")}.
- reading: kana pronunciation (empty if already kana)
- image_query: 2-4 word English noun phrase for Unsplash (concrete, photographic, child-friendly). Verbs→scene (食べる="child eating noodles"), abstracts→closest visual (楽しい="children laughing").
- example_jp/example_en: simple sentence pair for a young learner.
If a word has multiple translations, use the most common/natural one.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
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
                  example_en: { type: "string" },
                },
                required: [
                  "word",
                  "reading",
                  "meaning",
                  "image_query",
                  "example_jp",
                  "example_en",
                ],
              },
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini Error:", JSON.stringify(data, null, 2));
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
