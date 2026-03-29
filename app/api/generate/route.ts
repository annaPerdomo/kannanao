import { NextRequest, NextResponse } from 'next/server';

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
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { pendingWords } = (await req.json()) as GeneratePayload;

  if (!pendingWords?.length) {
    return NextResponse.json({ error: 'No words provided' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }

  try {
    const prompt = `You are a Japanese language teacher. Create flashcards for these words: ${pendingWords.join(', ')}. 
For the "reading" field: use hiragana/katakana. If the word is already kana, leave "reading" empty.
For "image_query": provide a vivid 2-4 word English phrase for a photo search.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            response_schema: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  word: { type: 'string' },
                  reading: { type: 'string' },
                  meaning: { type: 'string' },
                  image_query: { type: 'string' },
                  example_jp: { type: 'string' },
                  example_en: { type: 'string' },
                },
                required: ['word', 'reading', 'meaning', 'image_query', 'example_jp', 'example_en'],
              },
            },
          },
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini Error:', JSON.stringify(data, null, 2));
      return NextResponse.json(data, { status: response.status });
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    return NextResponse.json(JSON.parse(rawText));
  } catch (err) {
    console.error('[/api/generate]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
