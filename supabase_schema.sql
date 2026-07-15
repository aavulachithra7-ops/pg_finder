-- =============================================
-- PGFinder - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. PROFILES TABLE (linked to Supabase Auth users)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  email text unique not null,
  role text default 'tenant' check (role in ('tenant', 'owner')),
  avatar_url text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'tenant')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PG LISTINGS TABLE
create table if not exists pg_listings (
  id bigserial primary key,
  name text not null,
  location text not null,
  gender text default 'Any' check (gender in ('Male', 'Female', 'Co-Live', 'Any')),
  rent integer not null,
  rating numeric(3,1) default 0,
  distance text,
  amenities text[] default '{}',
  total_floors integer default 1,
  floor_availability jsonb default '{}',
  image text,
  owner_id uuid references profiles(id),
  created_at timestamptz default now()
);
alter table pg_listings enable row level security;
create policy "Anyone can view PG listings" on pg_listings for select using (true);
create policy "Owners can insert their own listings" on pg_listings for insert with check (auth.uid() = owner_id);
create policy "Owners can update their own listings" on pg_listings for update using (auth.uid() = owner_id);
create policy "Owners can delete their own listings" on pg_listings for delete using (auth.uid() = owner_id);


-- 3. PG REVIEWS TABLE
create table if not exists pg_reviews (
  id bigserial primary key,
  pg_id bigint references pg_listings(id) on delete cascade,
  user_id uuid references profiles(id),
  author text not null,
  rating integer check (rating between 1 and 5),
  text text not null,
  date text default 'Just now',
  avatar text,
  created_at timestamptz default now()
);
alter table pg_reviews enable row level security;
create policy "Anyone can read reviews" on pg_reviews for select using (true);
create policy "Authenticated users can write reviews" on pg_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own reviews" on pg_reviews for update using (auth.uid() = user_id);


-- 4. BOOKINGS TABLE
create table if not exists bookings (
  id bigserial primary key,
  pg_id bigint references pg_listings(id) on delete cascade,
  user_id uuid references profiles(id),
  pg_name text,
  user_name text,
  user_email text,
  user_phone text,
  move_in_date date,
  duration integer,
  room_type text,
  special_requests text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz default now()
);
alter table bookings enable row level security;
create policy "Users can view their own bookings" on bookings for select using (auth.uid() = user_id);
create policy "Authenticated users can create bookings" on bookings for insert with check (auth.uid() = user_id);
create policy "Owners can view bookings for their PGs" on bookings for select
  using (exists (select 1 from pg_listings where id = pg_id and owner_id = auth.uid()));


-- =============================================
-- SAMPLE DATA - Optional seed data
-- =============================================
insert into pg_listings (name, location, gender, rent, rating, distance, amenities, total_floors, floor_availability, image)
values
  ('Green Valley PG', 'Marathahalli', 'Female', 9000, 4.6, '1.2 km', ARRAY['WiFi','Food','Laundry','CCTV','Hot Water'], 4, '{"1":1,"2":0,"3":3,"4":2}', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80'),
  ('Comfort Zone PG', 'Marathahalli', 'Female', 10500, 4.9, '1.5 km', ARRAY['WiFi','Lift','Food','Hot Water','Laundry','CCTV','AC'], 6, '{"1":0,"2":0,"3":1,"4":2,"5":1,"6":3}', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&q=80'),
  ('Sunrise PG', 'Marathahalli', 'Male', 8500, 4.8, '0.8 km', ARRAY['WiFi','Lift','Generator','Food','Gym','Laundry'], 5, '{"1":0,"2":4,"3":2,"4":1,"5":0}', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80'),
  ('The Hub PG', 'Marathahalli', 'Co-Live', 8000, 4.5, '2.0 km', ARRAY['WiFi','Gym','Food','Laundry','Generator'], 4, '{"1":3,"2":2,"3":0,"4":1}', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80'),
  ('Budget Stay PG', 'Marathahalli', 'Male', 4500, 3.8, '2.5 km', ARRAY['WiFi','Food','Hot Water'], 3, '{"1":2,"2":5,"3":3}', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80'),
  ('Luxury Living Suites', 'Marathahalli', 'Co-Live', 12500, 4.9, '0.4 km', ARRAY['WiFi','AC','Lift','Food','Gym','CCTV','Parking','Laundry'], 7, '{"1":0,"2":0,"3":0,"4":1,"5":0,"6":1,"7":1}', 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=600&q=80')
on conflict do nothing;
