import { NextRequest, NextResponse } from "next/server";

interface ExtractedCard {
  word: string;
  reading: string;
  definition: string;
}

const EXTRACT_PROMPT = `Extract all Japanese vocabulary entries from this PDF vocabulary list.
For each entry return a JSON object with:
- "word": the Japanese word/phrase (in kana or kanji)
- "reading": the romaji pronunciation
- "definition": the English meaning (concise, just the core meaning)

Skip section headers and meta-content. Focus only on actual vocabulary words and phrases a student would need to memorize.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  let pdfBase64: string;
  try {
    const body = await req.json();
    pdfBase64 = body.pdfBase64;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!pdfBase64) {
    return NextResponse.json({ error: "pdfBase64 is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: pdfBase64,
                  },
                },
                { text: EXTRACT_PROMPT },
              ],
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
                  definition: { type: "string" },
                },
                required: ["word", "reading", "definition"],
              },
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[/api/pdf-extract] Gemini error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data.error?.message ?? "Gemini API error" },
        { status: response.status },
      );
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const cards: ExtractedCard[] = JSON.parse(rawText);

    return NextResponse.json(cards);
  } catch (err) {
    console.error("[/api/pdf-extract]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
