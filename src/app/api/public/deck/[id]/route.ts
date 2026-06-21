import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
  // Service role key bypasses RLS; fall back to anon key if not set.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";

  if (!supabaseUrl || !key) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const client = createClient(supabaseUrl, key);

  const { data: deck, error: deckError } = await client
    .from("decks")
    .select("id, name, description, emoji")
    .eq("id", id)
    .eq("is_public", true)
    .single();

  if (deckError || !deck) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: cards, error: cardsError } = await client
    .from("cards")
    .select("*")
    .eq("deck_id", id)
    .order("created_at", { ascending: true });

  if (cardsError) {
    return NextResponse.json({ error: "Failed to load cards" }, { status: 500 });
  }

  // Public, read-only deck content changes rarely. Cache it at Vercel's edge so
  // repeated embed/share views are served from the CDN instead of re-invoking
  // this Function (and re-querying Supabase) on every load. stale-while-revalidate
  // keeps responses instant while a fresh copy is fetched in the background, so an
  // organizer's edits surface within ~an hour rather than in real time.
  return NextResponse.json(
    { deck, cards: cards ?? [] },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
