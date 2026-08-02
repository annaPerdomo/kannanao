import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetStore } from '@/app/api/_lib/rateLimit';

// ─── Mock requireOrganizerAccount to pass through ────────────────────────────

vi.mock('@/app/api/_lib/requireOrganizerAccount', () => ({
  requireOrganizerAccount: vi.fn().mockResolvedValue({
    id: 'org1',
    username: 'organizer',
    account_type: 'organizer',
  }),
}));

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Setup env ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  _resetStore();
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

import { POST } from '@/app/api/generate/route';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockGeminiSuccess(cards: unknown[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify(cards) }],
          },
        },
      ],
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/generate', () => {
  it('should return 400 when pendingWords is empty', async () => {
    const req = makeRequest({ pendingWords: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('should return 400 when pendingWords is missing', async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('should return 400 when too many words are provided', async () => {
    const req = makeRequest({ pendingWords: Array.from({ length: 51 }, (_, i) => `word${i}`) });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('max 50');
  });

  it('should return 500 when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('GEMINI_API_KEY');
  });

  it('should return generated cards array on success', async () => {
    const generatedCards = [
      {
        word: '猫',
        reading: 'ねこ',
        meaning: 'cat',
        image_query: 'cat',
        example_jp: '{猫|ねこ}が好きです',
        example_en: 'I like cats',
        card_type: 'word',
        jlpt_level: 'N5',
      },
    ];
    mockGeminiSuccess(generatedCards);

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
    expect(body[0].word).toBe('猫');
    expect(body[0].reading).toBe('ねこ');
    expect(body[0].meaning).toBe('cat');
  });

  it('should return card with all required fields', async () => {
    const card = {
      word: '食べる',
      reading: 'たべる',
      meaning: 'to eat',
      image_query: 'eating food',
      example_jp: '{食|た}べます',
      example_en: 'I eat',
      card_type: 'word',
      jlpt_level: 'N5',
    };
    mockGeminiSuccess([card]);

    const req = makeRequest({ pendingWords: ['食べる'] });
    const res = await POST(req);
    const body = await res.json();

    expect(body[0]).toMatchObject({
      word: '食べる',
      reading: 'たべる',
      meaning: 'to eat',
    });
  });

  it('should return 500 when Gemini throws an Error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Network error');
  });

  it('should not mention topics in the prompt by default', async () => {
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['猫'] }));

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('exactly one card per item');
    expect(prompt).not.toContain('days of the week');
  });

  it('should ask for topic expansion when the flag is set', async () => {
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['days of the week'], expandTopics: true }));

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('one card per member');
    expect(prompt).not.toContain('exactly one card per item');
  });

  // Months and days are the topics people reach for first, and the model's
  // default is Arabic numerals — 1月, 20日 — which teaches no kanji at all.
  it('should ask for kanji numerals whether or not topics expand', async () => {
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['months'], expandTopics: true }));
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['一月'] }));

    for (const call of mockFetch.mock.calls) {
      const prompt = JSON.parse(call[1].body).contents[0].parts[0].text;
      expect(prompt).toContain('一月 not 1月');
      expect(prompt).toContain('はつか');
    }
  });

  it('should append a retry instruction and let it win over the field rules', async () => {
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['1月'], instruction: 'spell numbers out in kana' }));

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).toContain('spell numbers out in kana');
    expect(prompt).toContain('the correction wins');
    // Last word, so it overrides the rules above rather than being overridden.
    expect(prompt.indexOf('spell numbers out in kana')).toBeGreaterThan(
      prompt.indexOf('一月 not 1月'),
    );
  });

  it('should leave the prompt alone when no instruction is given', async () => {
    mockGeminiSuccess([]);
    await POST(makeRequest({ pendingWords: ['猫'] }));

    const prompt = JSON.parse(mockFetch.mock.calls[0][1].body).contents[0].parts[0].text;
    expect(prompt).not.toContain('the correction wins');
  });

  it('should reject an over-long instruction', async () => {
    const res = await POST(makeRequest({ pendingWords: ['猫'], instruction: 'x'.repeat(301) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('too long');
  });

  it('should return more cards than words when a topic expands', async () => {
    const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    mockGeminiSuccess(
      days.map((word) => ({
        word,
        reading: '',
        romaji: '',
        meaning: 'day',
        image_query: 'calendar',
        example_jp: '',
        example_en: '',
        card_type: 'word',
        jlpt_level: 'N5',
      })),
    );

    const res = await POST(makeRequest({ pendingWords: ['days of the week'], expandTopics: true }));
    const body = await res.json();
    expect(body).toHaveLength(7);
    expect(body.map((c: { word: string }) => c.word)).toEqual(days);
  });

  it('should trim an expanded response to the card ceiling', async () => {
    mockGeminiSuccess(Array.from({ length: 80 }, (_, i) => ({ word: `語${i}` })));

    const res = await POST(makeRequest({ pendingWords: ['everything'], expandTopics: true }));
    expect(await res.json()).toHaveLength(60);
  });

  it('should not trim when expansion was not requested', async () => {
    mockGeminiSuccess(Array.from({ length: 80 }, (_, i) => ({ word: `語${i}` })));

    const res = await POST(makeRequest({ pendingWords: ['猫'] }));
    expect(await res.json()).toHaveLength(80);
  });

  it('should reject a non-boolean expandTopics', async () => {
    const res = await POST(makeRequest({ pendingWords: ['猫'], expandTopics: 'yes' }));
    expect(res.status).toBe(400);
  });

  it('should return generic message when a non-Error is thrown', async () => {
    mockFetch.mockRejectedValueOnce('unexpected string rejection');

    const req = makeRequest({ pendingWords: ['猫'] });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('Internal server error');
  });

  it('normalizes per-character furigana before returning the cards', async () => {
    // Gemini writes compounds both ways; the app downstream should only ever
    // see one of them, whatever the prompt asked for.
    mockGeminiSuccess([
      { word: '学校', reading: 'がっこう', example_jp: '{学校|がっ|こう}へ行きます' },
    ]);
    const res = await POST(makeRequest({ pendingWords: ['学校'] }));
    const body = await res.json();
    expect(body[0].example_jp).toBe('{学|がっ}{校|こう}へ行きます');
  });
});
