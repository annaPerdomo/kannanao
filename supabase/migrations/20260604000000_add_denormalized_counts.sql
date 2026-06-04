-- Denormalized counts so the dashboard / list pages don't have to fetch every
-- card and every speech line just to display "N cards" / "N lines". Triggers
-- keep the counts exact on insert/delete/move. SECURITY DEFINER + locked
-- search_path so the maintenance updates work regardless of caller / future RLS.

-- ── Columns (backfilled below) ──
alter table decks add column if not exists card_count integer not null default 0;
alter table ohanashikais add column if not exists line_count integer not null default 0;

-- ── One-time backfill from existing rows ──
update decks d
  set card_count = (select count(*) from cards c where c.deck_id = d.id);
update ohanashikais o
  set line_count = (select count(*) from ohanashikai_lines l where l.ohanashikai_id = o.id);

-- ── decks.card_count maintenance ──
create or replace function sync_deck_card_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update decks set card_count = card_count + 1 where id = new.deck_id;
  elsif (tg_op = 'DELETE') then
    update decks set card_count = greatest(card_count - 1, 0) where id = old.deck_id;
  elsif (tg_op = 'UPDATE' and new.deck_id is distinct from old.deck_id) then
    update decks set card_count = greatest(card_count - 1, 0) where id = old.deck_id;
    update decks set card_count = card_count + 1 where id = new.deck_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_deck_card_count on cards;
create trigger trg_sync_deck_card_count
  after insert or delete or update of deck_id on cards
  for each row execute function sync_deck_card_count();

-- ── ohanashikais.line_count maintenance ──
create or replace function sync_ohanashikai_line_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update ohanashikais set line_count = line_count + 1 where id = new.ohanashikai_id;
  elsif (tg_op = 'DELETE') then
    update ohanashikais set line_count = greatest(line_count - 1, 0) where id = old.ohanashikai_id;
  elsif (tg_op = 'UPDATE' and new.ohanashikai_id is distinct from old.ohanashikai_id) then
    update ohanashikais set line_count = greatest(line_count - 1, 0) where id = old.ohanashikai_id;
    update ohanashikais set line_count = line_count + 1 where id = new.ohanashikai_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_sync_ohanashikai_line_count on ohanashikai_lines;
create trigger trg_sync_ohanashikai_line_count
  after insert or delete or update of ohanashikai_id on ohanashikai_lines
  for each row execute function sync_ohanashikai_line_count();
