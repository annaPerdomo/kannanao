import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  FAKE_DOMAIN,
  getSupabaseConfig,
  authenticateUser,
  handleProfileAction,
} from "../_lib/profile-actions";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "test";

async function authenticateAdmin(req: Request) {
  const auth = await authenticateUser(req);
  if ("error" in auth) return auth;

  const username = auth.user.email?.split("@")[0] ?? "";
  if (username !== ADMIN_USERNAME || !auth.user.email?.endsWith(`@${FAKE_DOMAIN}`)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return auth;
}

export async function GET(req: Request) {
  const auth = await authenticateAdmin(req);
  if ("error" in auth) return auth.error;

  const { url, serviceKey } = getSupabaseConfig();

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

  const overview = {
    totalUsers: profiles.length,
    totalDecks: decks.length,
    totalCards: cards.length,
    totalTodos: todos.length,
    totalWaitlist: waitlist.length,
    totalEventTypes: eventTypes.length,
  };

  return NextResponse.json({ overview, users: userStats, waitlist });
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdmin(req);
  if ("error" in auth) return auth.error;

  const body = await req.json() as Record<string, unknown>;
  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  return handleProfileAction(auth.serviceClient, userId, body);
}
