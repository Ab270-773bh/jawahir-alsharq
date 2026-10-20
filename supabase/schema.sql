-- Jawahir Alsharq starter schema for Supabase
-- Run this file in Supabase SQL Editor for a NEW project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'منتجات مختارة',
  price_syp numeric(14,2) not null default 0 check (price_syp >= 0),
  price_usd numeric(12,2) not null default 0 check (price_usd >= 0),
  description text not null default '',
  usage text not null default '',
  images text[] not null default '{}',
  featured boolean not null default false,
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'new' check (status in ('new','confirmed','preparing','shipped','completed','cancelled')),
  customer_name text not null,
  phone text not null,
  address text not null,
  notes text not null default '',
  total_syp numeric(14,2) not null default 0,
  total_usd numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_syp numeric(14,2) not null default 0,
  unit_price_usd numeric(12,2) not null default 0
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  whatsapp text not null default '',
  instagram text not null default '',
  telegram text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.store_settings enable row level security;

create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true); $$;

-- Create a profile for each new auth user. Users never receive admin automatically.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id,email,is_admin) values(new.id,new.email,false)
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Public can read active products. Only admins can insert/update/delete.
drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products" on public.products for select using (active = true or public.is_store_admin());
drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products" on public.products for insert to authenticated with check (public.is_store_admin());
drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products for delete to authenticated using (public.is_store_admin());

drop policy if exists "Users view own profile or admins view all" on public.profiles;
create policy "Users view own profile or admins view all" on public.profiles for select to authenticated using (id = auth.uid() or public.is_store_admin());
drop policy if exists "Users update own non-admin profile" on public.profiles;
create policy "Users update own non-admin profile" on public.profiles for update to authenticated using (id = auth.uid() and not is_admin) with check (id = auth.uid() and not is_admin);
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles" on public.profiles for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Users view own orders and admins all" on public.orders;
create policy "Users view own orders and admins all" on public.orders for select to authenticated using (user_id = auth.uid() or public.is_store_admin());
drop policy if exists "Users create own orders" on public.orders;
create policy "Users create own orders" on public.orders for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Users view own order items and admins all" on public.order_items;
create policy "Users view own order items and admins all" on public.order_items for select to authenticated using (
  exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_store_admin()))
);
drop policy if exists "Users add items to own orders" on public.order_items;
create policy "Users add items to own orders" on public.order_items for insert to authenticated with check (
  exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);
drop policy if exists "Admins manage order items" on public.order_items;
create policy "Admins manage order items" on public.order_items for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());

drop policy if exists "Anyone can read store settings" on public.store_settings;
create policy "Anyone can read store settings" on public.store_settings for select using (true);
drop policy if exists "Admins manage store settings" on public.store_settings;
create policy "Admins manage store settings" on public.store_settings for all to authenticated using (public.is_store_admin()) with check (public.is_store_admin());
insert into public.store_settings(id) values(1) on conflict(id) do nothing;

-- Storage bucket for product photos. Public URLs make product images visible in the storefront.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('product-images','product-images',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;
drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images" on storage.objects for select using (bucket_id='product-images');
drop policy if exists "Admins upload product images" on storage.objects;
create policy "Admins upload product images" on storage.objects for insert to authenticated with check (bucket_id='product-images' and public.is_store_admin());
drop policy if exists "Admins update product images" on storage.objects;
create policy "Admins update product images" on storage.objects for update to authenticated using (bucket_id='product-images' and public.is_store_admin()) with check (bucket_id='product-images' and public.is_store_admin());
drop policy if exists "Admins delete product images" on storage.objects;
create policy "Admins delete product images" on storage.objects for delete to authenticated using (bucket_id='product-images' and public.is_store_admin());

-- IMPORTANT: promote the first administrator manually after registering that account.
-- Run in SQL Editor, replacing the email with your exact account email:
-- update public.profiles set is_admin = true where email = 'YOUR_ADMIN_EMAIL';
