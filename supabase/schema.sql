create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  spent_on date not null,
  category text not null check (category in ('Bevande', 'Cornetti', 'Tramezzini')),
  product text not null check (product in ('Caffè', 'Cappuccino', 'Cornetto', 'Tramezzino')),
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  amount numeric(10, 2) not null check (amount >= 0),
  note text not null default '' check (char_length(note) <= 140),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  paid_on date not null,
  week_start date not null,
  member_id uuid not null references public.members(id) on delete restrict,
  amount numeric(10, 2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 140),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on);
create index if not exists payments_paid_on_idx on public.payments (paid_on);

insert into public.members (name) values
  ('Andrea'),
  ('Valentina'),
  ('Matteo T'),
  ('Matteo F'),
  ('Daniele'),
  ('Valerio'),
  ('Francesco'),
  ('Riccardo'),
  ('Alessia'),
  ('Giorgia G'),
  ('Giorgia M')
on conflict (name) do nothing;

alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Authenticated users can read members" on public.members;
create policy "Authenticated users can read members"
  on public.members for select to authenticated using (true);

drop policy if exists "Authenticated users can read expenses" on public.expenses;
create policy "Authenticated users can read expenses"
  on public.expenses for select to authenticated using (true);
drop policy if exists "Authenticated users can add expenses" on public.expenses;
create policy "Authenticated users can add expenses"
  on public.expenses for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Authenticated users can delete expenses" on public.expenses;
create policy "Authenticated users can delete expenses"
  on public.expenses for delete to authenticated using (auth.uid() is not null);

drop policy if exists "Authenticated users can read payments" on public.payments;
create policy "Authenticated users can read payments"
  on public.payments for select to authenticated using (true);
drop policy if exists "Authenticated users can add payments" on public.payments;
create policy "Authenticated users can add payments"
  on public.payments for insert to authenticated with check (auth.uid() is not null);
drop policy if exists "Authenticated users can delete payments" on public.payments;
create policy "Authenticated users can delete payments"
  on public.payments for delete to authenticated using (auth.uid() is not null);

grant usage on schema public to authenticated;
grant select on public.members to authenticated;
grant select, insert, delete on public.expenses, public.payments to authenticated;
