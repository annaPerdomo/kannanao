import { type NextRequest, NextResponse } from 'next/server';

import { sb } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const name = (body.name ?? '').trim().slice(0, 100);
    const message = (body.message ?? '').trim().slice(0, 500);

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    }

    // Check for duplicate
    const { data: existing } = await sb
      .from('waitlist')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { message: "You're already on the waitlist! We'll be in touch." },
        { status: 200 },
      );
    }

    const { error } = await sb.from('waitlist').insert({
      email,
      name: name || null,
      message: message || null,
    });

    if (error) {
      console.error('Waitlist insert error:', error);
      return NextResponse.json(
        { error: 'Something went wrong. Please try again.' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: "You're on the list! We'll reach out when spots open up." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
