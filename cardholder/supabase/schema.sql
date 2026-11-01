-- CardHolder database schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank text not null,
  kind text not null check (kind in ('Дебетовая','Кредитная','Премиальная')),
  network text not null default 'МИР',
  cashback text not null default 'Уточняйте у банка',
  fee text not null default 'Уточняйте у банка',
  color text not null default 'blue',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.favorites enable row level security;

create policy "Profiles: owner reads own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);
-- No client-side profile updates: in particular, users must not be able to grant
-- themselves the is_admin role. Manage admin roles only in the Supabase dashboard.

create policy "Cards: public read" on public.cards
  for select to anon, authenticated using (true);
create policy "Cards: admins insert" on public.cards
  for insert to authenticated with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
create policy "Cards: admins update" on public.cards
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
create policy "Cards: admins delete" on public.cards
  for delete to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Favorites: owner reads" on public.favorites
  for select to authenticated using (auth.uid() = user_id);
create policy "Favorites: owner adds" on public.favorites
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Favorites: owner removes" on public.favorites
  for delete to authenticated using (auth.uid() = user_id);

-- Create a profile automatically for each new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Demo cards. These are illustrative placeholders, not verified current offers.
insert into public.cards (name,bank,kind,network,cashback,fee,color,description)
values
('Black','Т-Банк','Дебетовая','МИР','Демонстрационный пример','Уточняйте у банка','black','Пример записи. Проверьте актуальные условия на официальном сайте банка.'),
('СберКарта','СберБанк','Дебетовая','МИР','Демонстрационный пример','Уточняйте у банка','green','Пример записи. Проверьте актуальные условия на официальном сайте банка.'),
('Альфа-Карта','Альфа-Банк','Дебетовая','МИР','Демонстрационный пример','Уточняйте у банка','red','Пример записи. Проверьте актуальные условия на официальном сайте банка.')
on conflict do nothing;
