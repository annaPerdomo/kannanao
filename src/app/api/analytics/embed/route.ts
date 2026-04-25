import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

interface EmbedEventBody {
  deckId: string;
  sessionId: string;
  eventType: 'view' | 'card_flip' | 'deck_complete' | 'session_end';
  cardIndex?: number;
  durationSeconds?: number;
  referrer?: string;
}

export async function POST(req: Request) {
  let body: EmbedEventBody;
  try {
    body = (await req.json()) as EmbedEventBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { deckId, sessionId, eventType, cardIndex, durationSeconds, referrer } = body;

  if (!deckId || !sessionId || !eventType) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const VALID_EVENT_TYPES = ['view', 'card_flip', 'deck_complete', 'session_end'];
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) {
    // Silently succeed if Supabase is not configured
    return NextResponse.json({ ok: true });
  }

  const client = createClient(url, key);
  const { error } = await client.from('embed_events').insert({
    deck_id: deckId,
    session_id: sessionId,
    event_type: eventType,
    card_index: cardIndex ?? null,
    duration_seconds: durationSeconds ?? null,
    referrer: referrer ? referrer.substring(0, 500) : null,
  });

  if (error) {
    console.error('embed_events insert error', error);
    // Don't surface errors to the client — analytics should never break the embed
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
