import { NextRequest, NextResponse } from "next/server";

import type { GeneratedCard } from "@/types/flashcard";

function stripPeriods(s: string) {
  return s.replace(/\./g, "");
}

const EXTRACT_PROMPT = `Japanese language teacher. Extract all vocabulary entries from this PDF and generate complete flashcard data for each one.
For each vocabulary word or phrase found, return a JSON object with:
- "word": the Japanese word/phrase (in kana or kanji)
- "reading": kana pronunciation (empty string if already kana)
- "meaning": English meaning — most common/natural one, no periods
- "image_query": 2-4 word English noun phrase for Unsplash (concrete, photographic, child-friendly). Verbs→scene (食べる="child eating noodles"), abstracts→closest visual (楽しい="children laughing"). For phrases, pick the most concrete noun.
- "example_jp": simple sentence for a young learner using the word naturally. Wrap every kanji (or kanji compound) with its hiragana reading using {kanji|reading} format. Example: {猫|ねこ}が{好|す}きです。 Pure kana words need no wrapping.
- "example_en": English translation of the example sentence, no trailing period.
- "card_type": "word" for single vocabulary words, "phrase" for multi-word expressions or full phrases.

Skip section headers and meta-content. Focus only on actual vocabulary words and phrases a student would need to memorize. Do not include periods in any field.`;

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
                  meaning: { type: "string" },
                  image_query: { type: "string" },
                  example_jp: { type: "string" },
                  example_en: { type: "string" },
                  card_type: { type: "string", enum: ["word", "phrase"] },
                },
                required: ["word", "reading", "meaning", "image_query", "example_jp", "example_en", "card_type"],
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
    const cards: GeneratedCard[] = JSON.parse(rawText);
    const cleaned = cards.map((c) => ({
      ...c,
      word: stripPeriods(c.word),
      reading: stripPeriods(c.reading),
      meaning: stripPeriods(c.meaning),
      example_en: stripPeriods(c.example_en),
    }));

    return NextResponse.json(cleaned);
  } catch (err) {
    console.error("[/api/pdf-extract]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 },
    );
  }
}
