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

/** Verify admin and return a service-role client, or an error response. */
async function authenticateAdmin(req: Request) {
  const url = getSupabaseUrl();
  const anonKey = getAnonKey();
  const serviceKey = getServiceRoleKey();

  if (!url || !anonKey || !serviceKey) {
    return { error: NextResponse.json({ error: "Server misconfigured" }, { status: 500 }) };
  }

  const anonClient = createClient(url, anonKey);
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const username = user.email?.split("@")[0] ?? "";
  if (username !== ADMIN_USERNAME || !user.email?.endsWith(`@${FAKE_DOMAIN}`)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { client: createClient(url, serviceKey) };
}

export async function PATCH(req: Request) {
  const auth = await authenticateAdmin(req);
  if ("error" in auth) return auth.error;
  const client = auth.client;

  const body = await req.json();
  const { userId, action } = body as { userId?: string; action?: string };

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
  }

  if (action === "changePassword") {
    const { password } = body as { password?: string };
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }

    const { error } = await client.auth.admin.updateUserById(userId, { password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: "Password updated." });
  }

  if (action === "changeUsername") {
    const { username } = body as { username?: string };
    if (!username || !/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 2-30 characters (letters, numbers, _ or -)." }, { status: 400 });
    }

    const newEmail = `${username.trim().toLowerCase()}@${FAKE_DOMAIN}`;

    // Check for duplicate username in profiles
    const { data: existing } = await client.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
    if (existing && existing.id !== userId) {
      return NextResponse.json({ error: "Username already taken." }, { status: 409 });
    }

    // Update email in auth.users
    const { error: authErr } = await client.auth.admin.updateUserById(userId, { email: newEmail });
    if (authErr) {
      return NextResponse.json({ error: authErr.message }, { status: 500 });
    }

    // Update username in profiles table
    const { error: profileErr } = await client.from("profiles").update({ username: username.toLowerCase() }).eq("id", userId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Username updated." });
  }

  if (action === "changeDisplayName") {
    const { displayName } = body as { displayName?: string };
    const trimmed = (displayName ?? "").trim().slice(0, 100);

    const { error: profileErr } = await client
      .from("profiles")
      .update({ display_name: trimmed || null })
      .eq("id", userId);
    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Display name updated." });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
