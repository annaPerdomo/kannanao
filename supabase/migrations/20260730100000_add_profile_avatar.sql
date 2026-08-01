-- Buddy-face avatar, stored as '<shop item key>:<face variant>' (e.g. 'buddy_fox:3').
-- NULL means "no avatar chosen" and the UI falls back to the name initial.
-- Ownership is enforced client-side like shop prices are; the constraint only
-- guards the format so a bad write can never break every surface that renders it.
alter table public.profiles
  add column if not exists avatar text;

-- The `[1-8]` is BUDDY_FACE_COUNT (src/lib/buddies.ts). Raising that constant
-- without widening this range makes the picker fail on the new faces with a raw
-- constraint-violation message, so the two have to move together.
alter table public.profiles
  add constraint profiles_avatar_format
  check (avatar is null or avatar ~ '^buddy_[a-z0-9_]+:[1-8]$');
