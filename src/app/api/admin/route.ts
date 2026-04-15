import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "test";
const FAKE_DOMAIN = "kannanao.local";

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
}

function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export async function GET(req: Request) {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  const serviceKey = getServiceRoleKey();

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Use anon client to verify user identity from their JWT
  const anonClient = createClient(url, anonKey);

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if the user is the admin
  const username = user.email?.split("@")[0] ?? "";
  if (username !== ADMIN_USERNAME || !user.email?.endsWith(`@${FAKE_DOMAIN}`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Use service role client for data queries (bypasses RLS)
  if (!serviceKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not configured. Admin queries require the service role key to bypass RLS." },
      { status: 500 },
    );
  }

  const client = createClient(url, serviceKey);

  // Fetch all data in parallel
  const [
    profilesRes,
    decksRes,
    cardsRes,
    todosRes,
    waitlistRes,
    eventTypesRes,
  ] = await Promise.all([
    client.from("profiles").select("id, username, display_name, color_scheme, created_at"),
    client.from("decks").select("id, user_id, name, created_at, emoji, pinned, is_public"),
    client.from("cards").select("id, deck_id, word, card_type, jlpt_level, created_at"),
    client.from("todos").select("id, user_id, text, emoji, completed, frequency_days, completed_dates, created_at"),
    client.from("waitlist").select("id, email, name, message, created_at").order("created_at", { ascending: false }),
    client.from("event_types").select("id, user_id, name, emoji, color"),
  ]);

  const profiles = profilesRes.data ?? [];
  const decks = decksRes.data ?? [];
  const cards = cardsRes.data ?? [];
  const todos = todosRes.data ?? [];
  const waitlist = waitlistRes.data ?? [];
  const eventTypes = eventTypesRes.data ?? [];

  // Build per-user stats
  const userStats = profiles.map((p) => {
    const userDecks = decks.filter((d) => d.user_id === p.id);
    const userDeckIds = new Set(userDecks.map((d) => d.id));
    const userCards = cards.filter((c) => userDeckIds.has(c.deck_id));
    const userTodos = todos.filter((t) => t.user_id === p.id);
    const userEventTypes = eventTypes.filter((e) => e.user_id === p.id);

    const totalCompletions = userTodos.reduce((sum, t) => {
      const dates = t.completed_dates;
      return sum + (Array.isArray(dates) ? dates.length : 0);
    }, 0);

    return {
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      colorScheme: p.color_scheme,
      createdAt: p.created_at,
      deckCount: userDecks.length,
      cardCount: userCards.length,
      todoCount: userTodos.length,
      todoCompletions: totalCompletions,
      eventTypeCount: userEventTypes.length,
      publicDecks: userDecks.filter((d) => d.is_public).length,
    };
  });

  // Overview stats
  const overview = {
    totalUsers: profiles.length,
    totalDecks: decks.length,
    totalCards: cards.length,
    totalTodos: todos.length,
    totalWaitlist: waitlist.length,
    totalEventTypes: eventTypes.length,
  };

  return NextResponse.json({
    overview,
    users: userStats,
    waitlist,
  });
}
