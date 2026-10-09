-- ============================================================================
--  Tilisarao Libre - Esquema para Supabase
--  Pegar TODO en: Supabase > SQL Editor > New query > Run
--  Se puede correr mas de una vez, no rompe nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PERFILES (nick del usuario, vinculado al auth de Supabase)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nick       text not null unique check (char_length(nick) between 3 and 30),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfiles publicos: nick visible en los productos';

-- ---------------------------------------------------------------------------
-- 2. PRODUCTOS
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  nick        text not null default '',
  title       text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  price       numeric(12,2) not null default 0 check (price >= 0),
  image_url   text,
  created_at  timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_price_idx        on public.products (price);
create index if not exists products_nick_idx         on public.products (nick);

-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products  enable row level security;

drop policy if exists "profiles public read"   on public.profiles;
drop policy if exists "profiles insert own"    on public.profiles;
drop policy if exists "profiles update own"    on public.profiles;
drop policy if exists "profiles delete own"    on public.profiles;

create policy "profiles public read" on public.profiles
  for select using (true);

create policy "profiles insert own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles update own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles delete own" on public.profiles
  for delete using (id = auth.uid());

drop policy if exists "products public read" on public.products;
drop policy if exists "products insert own"  on public.products;
drop policy if exists "products update own"  on public.products;
drop policy if exists "products delete own"  on public.products;

create policy "products public read" on public.products
  for select using (true);

create policy "products insert own" on public.products
  for insert with check (auth.uid() is not null and user_id = auth.uid());

create policy "products update own" on public.products
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "products delete own" on public.products
  for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. PERMISOS DE LA DATA API
--     Desactivaste "Automatically expose new tables", asi que los grants
--     se hacen a mano. Si no, el front recibe 401/404 en las tablas nuevas.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.products to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. TRIGGER: crea el profile cuando se registra un usuario
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base    text;
  new_nick text;
begin
  base := coalesce(
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'nick', '')), ''),
    split_part(coalesce(new.email, 'usuario'), '@', 1)
  );
  base := regexp_replace(base, '[^a-zA-Z0-9_]', '', 'g');

  if char_length(base) < 3 then
    base := base || 'user';
  end if;
  if char_length(base) > 26 then
    base := substring(base from 1 for 26);
  end if;

  new_nick := base;
  if exists (select 1 from public.profiles p where p.nick = new_nick) then
    new_nick := base || '_' || floor(random() * 9000 + 1000)::text;
  end if;

  insert into public.profiles (id, nick)
  values (new.id, new_nick)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 6. STORAGE: bucket "productos" (lectura publica, escritura propia)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('productos', 'productos', true)
on conflict (id) do update set public = true;

drop policy if exists "productos public read"   on storage.objects;
drop policy if exists "productos insert own"    on storage.objects;
drop policy if exists "productos update own"    on storage.objects;
drop policy if exists "productos delete own"    on storage.objects;

create policy "productos public read" on storage.objects
  for select using (bucket_id = 'productos');

create policy "productos insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and owner = auth.uid());

create policy "productos update own" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and owner = auth.uid())
  with check (bucket_id = 'productos' and owner = auth.uid());

create policy "productos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. DATOS DE EJEMPLO (imagenes servidas desde /assets del repo)
-- ---------------------------------------------------------------------------
insert into public.products (id, title, description, price, nick, image_url, user_id)
values
  (gen_random_uuid(), 'Teclado Mecanico RGB',
   'Teclado gamer con retroiluminacion RGB y switches azules. Perfecto para gaming y trabajo.',
   19990, 'tilisarao', 'assets/productos/IMG-20230621-WA0012_1761418873485_kwaqr6.jpg', null),
  (gen_random_uuid(), 'Mouse Gamer 7200DPI',
   'Mouse optico con 7 botones programables y luces LED. Ideal para gamers profesionales.',
   8500, 'tilisarao', 'assets/productos/IMG-20230621-WA0015_1761419549644_8y22ts.jpg', null),
  (gen_random_uuid(), 'Auriculares Gamer',
   'Auriculares con micrófono y sonido envolvente para gaming. Comodidad garantizada.',
   12300, 'tilisarao', 'assets/productos/IMG-20230621-WA0017_1761418540652_9wd9y4.jpg', null),
  (gen_random_uuid(), 'Monitor Gaming 27"',
   'Monitor LED con 144Hz y tiempo de respuesta 1ms. Experiencia gaming inmersiva.',
   69990, 'tilisarao', 'assets/productos/IMG-20230621-WA0002_1761413453954_tx5gkn.jpg', null),
  (gen_random_uuid(), 'SSD NVMe 1TB',
   'Almacenamiento NVMe de alta velocidad para juegos y aplicaciones.',
   49990, 'tilisarao', 'assets/productos/IMG-20230621-WA0003_1761413182160_s58l2o.jpg', null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Comprobacion
--   select count(*) from public.products;
--   select nick from public.profiles;
--   select id, name, public from storage.buckets where id = 'productos';
-- ---------------------------------------------------------------------------
