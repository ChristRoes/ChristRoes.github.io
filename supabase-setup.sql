-- Im Supabase-Dashboard unter "SQL Editor" einmal ausführen.
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  start_time text,
  end_time text,
  person text not null default 'alle' check (person in ('josefb','heidi','josefr','markus','alle')),
  reminder text,
  created_at timestamptz not null default now()
);
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  shop_date date not null,
  person text not null default 'alle' check (person in ('josefb','heidi','josefr','markus','alle')),
  created_at timestamptz not null default now()
);

alter table public.appointments  enable row level security;
alter table public.shopping_items enable row level security;

-- Alte, offene Policies entfernen (falls vorhanden)
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
           where schemaname='public' and tablename in ('appointments','shopping_items')
  loop execute format('drop policy %I on public.%I', r.policyname, r.tablename); end loop;
end $$;

-- Nur angemeldete Nutzer dürfen lesen/schreiben (anonym: kein Zugriff)
create policy "familie_all" on public.appointments   for all to authenticated using (true) with check (true);
create policy "familie_all" on public.shopping_items for all to authenticated using (true) with check (true);

-- Live-Sync
alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.shopping_items;
