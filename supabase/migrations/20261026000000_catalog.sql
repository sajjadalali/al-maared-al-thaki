-- Showroom catalog for the site and for Sadeem (the LLM sales assistant).
--
--   brands ─< models ─< cars ─< car_images
--                        cars >─< features   (car_features)
--   leads, chat_sessions ─< chat_messages    (written by the server only)
--
-- The catalog is public (read-only for anon); leads and chat logs have RLS on
-- and no policies, so only the server's secret key can touch them.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Arabic normalization: the same rules as normalizeArabic() in
-- src/lib/carAliases.ts, so aliases written there match here.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_ar(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
    regexp_replace(lower(coalesce(t, '')), '[\u064B-\u0652\u0640]', '', 'g'),
    'أإآةى٠١٢٣٤٥٦٧٨٩',
    'اااهي0123456789'
  );
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table public.brands (
  id text primary key,                         -- "toyota"
  name text not null unique,                   -- "Toyota", as on the site
  name_ar text not null,                       -- "تويوتا"
  aliases text[] not null default '{}',        -- normalized spellings buyers use
  is_chinese boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.brands is 'Car makes. aliases are normalized (normalize_ar) spellings such as بنز for Mercedes.';

create table public.models (
  id text primary key,                         -- "toyota-land-cruiser"
  brand_id text not null references public.brands (id) on update cascade,
  name text not null,                          -- "Land Cruiser"
  name_ar text,                                -- "لاندكروزر"
  aliases text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (brand_id, name)
);
create index models_brand_id_idx on public.models (brand_id);
comment on table public.models is 'Models per make. aliases match the whole model only (برادو is not لاندكروزر).';

create table public.cars (
  id text primary key,                         -- "car-001", same id as the site
  model_id text not null references public.models (id) on update cascade,
  trim_level text,
  year smallint not null check (year between 1990 and 2035),
  price_iqd bigint not null check (price_iqd > 0),
  condition text not null check (condition in ('جديدة', 'مستعملة')),
  origin text check (origin in ('وكالة', 'خليجي', 'أمريكي', 'كوري', 'كندي', 'أوروبي', 'صيني')),
  body_type text not null check (body_type in ('سيدان', 'SUV', 'هاتشباك', 'دفع رباعي', 'شاحنة', 'كوبيه')),
  mileage_km integer not null default 0 check (mileage_km >= 0),
  transmission text not null check (transmission in ('أوتوماتيك', 'يدوي')),
  fuel text not null check (fuel in ('بنزين', 'ديزل', 'هايبرد', 'كهربائي')),
  engine text not null default '',
  cylinders smallint check (cylinders between 0 and 16),
  horsepower smallint check (horsepower between 0 and 2000),
  drivetrain text check (drivetrain in ('أمامي', 'خلفي', 'رباعي', 'كلي')),
  seats smallint not null default 5 check (seats between 1 and 15),
  color text not null default '',
  city text not null,
  status text not null default 'متوفرة' check (status in ('متوفرة', 'محجوزة', 'مباعة')),
  featured boolean not null default false,
  tags text[] not null default '{}',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index cars_model_id_idx on public.cars (model_id);
create index cars_status_price_idx on public.cars (status, price_iqd);
comment on table public.cars is 'Showroom stock. price_iqd is the asking price in Iraqi dinars.';

create table public.features (
  id bigint generated always as identity primary key,
  name text not null unique                    -- "فتحة سقف"
);

create table public.car_features (
  car_id text not null references public.cars (id) on delete cascade,
  feature_id bigint not null references public.features (id) on delete cascade,
  position smallint not null default 0,
  primary key (car_id, feature_id)
);
create index car_features_feature_id_idx on public.car_features (feature_id);

create table public.car_images (
  id bigint generated always as identity primary key,
  car_id text not null references public.cars (id) on delete cascade,
  position smallint not null,                  -- 1 is the card photo
  path text not null,                          -- "/cars/car-001-1.webp" on the site, or a full URL
  author text,                                 -- credit for licensed photos
  license text,
  license_url text,
  source_url text,
  unique (car_id, position)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger cars_touch_updated_at
before update on public.cars
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Written by the server (secret key) only
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  car_id text references public.cars (id) on delete set null,
  name text,
  phone text not null,
  message text,
  source text not null default 'chat' check (source in ('chat', 'form', 'whatsapp')),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index leads_car_id_idx on public.leads (car_id);
comment on table public.leads is 'Buyers who left a phone number (from Sadeem or the contact form).';

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  car_ids text[] not null default '{}',        -- cars shown with this reply
  tool_calls jsonb,                            -- what Sadeem searched for, to tune it
  created_at timestamptz not null default now()
);
create index chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- Read model: one row per car with its names, features and photos
-- ---------------------------------------------------------------------------
create view public.cars_full
with (security_invoker = true)
as
select
  c.id,
  b.id as brand_id,
  b.name as brand,
  b.name_ar as brand_ar,
  b.aliases as brand_aliases,
  b.is_chinese,
  m.id as model_id,
  m.name as model,
  m.name_ar as model_ar,
  m.aliases as model_aliases,
  c.trim_level, c.year, c.price_iqd, c.condition, c.origin, c.body_type, c.mileage_km,
  c.transmission, c.fuel, c.engine, c.cylinders, c.horsepower, c.drivetrain, c.seats,
  c.color, c.city, c.status, c.featured, c.tags, c.description,
  coalesce(
    (select array_agg(f.name order by cf.position)
       from public.car_features cf join public.features f on f.id = cf.feature_id
      where cf.car_id = c.id),
    '{}'
  ) as features,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
              'path', i.path, 'author', i.author, 'license', i.license,
              'license_url', i.license_url, 'source_url', i.source_url)
            order by i.position)
       from public.car_images i where i.car_id = c.id),
    '[]'
  ) as images,
  -- Everything a buyer might type, normalized, for free-text search.
  public.normalize_ar(concat_ws(' ',
    b.name, b.name_ar, array_to_string(b.aliases, ' '), case when b.is_chinese then 'صيني' end,
    m.name, m.name_ar, array_to_string(m.aliases, ' '),
    c.trim_level, c.year::text, c.condition, c.origin, c.body_type, c.transmission, c.fuel,
    c.drivetrain, c.color, c.city, array_to_string(c.tags, ' '), c.description,
    (select string_agg(f.name, ' ')
       from public.car_features cf join public.features f on f.id = cf.feature_id
      where cf.car_id = c.id)
  )) as search_text,
  c.updated_at
from public.cars c
join public.models m on m.id = c.model_id
join public.brands b on b.id = m.brand_id;

-- ---------------------------------------------------------------------------
-- search_cars: what Sadeem calls. Structured filters do the exact work (the
-- LLM maps "لاندكروزر خليجي بحدود 150 مليون" to model + origin + max price);
-- p_text catches the rest, typos included (pg_trgm).
-- ---------------------------------------------------------------------------
create or replace function public.search_cars(
  p_text text default null,
  p_brands text[] default null,
  p_models text[] default null,
  p_body_types text[] default null,
  p_condition text default null,
  p_origins text[] default null,
  p_fuels text[] default null,
  p_transmission text default null,
  p_drivetrains text[] default null,
  p_cities text[] default null,
  p_min_price bigint default null,
  p_max_price bigint default null,
  p_min_year int default null,
  p_max_year int default null,
  p_min_seats int default null,
  p_max_mileage int default null,
  p_features text[] default null,
  p_tags text[] default null,
  p_chinese boolean default null,
  p_include_unavailable boolean default false,
  p_exclude_ids text[] default null,
  p_sort text default 'relevance',
  p_limit int default 6
)
returns table (
  id text, brand text, model text, trim_level text, year smallint, price_iqd bigint,
  condition text, origin text, body_type text, mileage_km integer, fuel text,
  transmission text, drivetrain text, seats smallint, horsepower smallint, engine text,
  color text, city text, status text, featured boolean, tags text[], features text[],
  image text, score real, total_count bigint
)
language sql
stable
set search_path = ''
as $$
  with params as (
    select
      (select array_agg(public.normalize_ar(x)) from unnest(p_brands) x) as brands,
      (select array_agg(public.normalize_ar(x)) from unnest(p_models) x) as models,
      (select array_agg(public.normalize_ar(x)) from unnest(p_features) x) as feats,
      (select array_agg(w) from unnest(regexp_split_to_array(public.normalize_ar(p_text), '\s+')) w
        where length(w) > 1 and w not in ('سياره', 'سيارات', 'موديل', 'اريد', 'عندكم', 'شنو')) as words
  ),
  matched as (
    select v.*,
      coalesce((select avg(extensions.word_similarity(w, v.search_text)) from unnest(p.words) w), 1)::real as text_score
    from public.cars_full v
    cross join params p
    where (p_include_unavailable or v.status <> 'مباعة')
      and (p.brands is null or public.normalize_ar(v.brand) = any (p.brands)
           or public.normalize_ar(v.brand_ar) = any (p.brands) or v.brand_aliases && p.brands)
      and (p.models is null or public.normalize_ar(v.model) = any (p.models)
           or public.normalize_ar(v.model_ar) = any (p.models) or v.model_aliases && p.models)
      and (p_body_types is null or v.body_type = any (p_body_types))
      and (p_condition is null or v.condition = p_condition)
      and (p_origins is null or v.origin = any (p_origins))
      and (p_fuels is null or v.fuel = any (p_fuels))
      and (p_transmission is null or v.transmission = p_transmission)
      and (p_drivetrains is null or v.drivetrain = any (p_drivetrains))
      and (p_cities is null or v.city = any (p_cities))
      and (p_min_price is null or v.price_iqd >= p_min_price)
      and (p_max_price is null or v.price_iqd <= p_max_price)
      and (p_min_year is null or v.year >= p_min_year)
      and (p_max_year is null or v.year <= p_max_year)
      and (p_min_seats is null or v.seats >= p_min_seats)
      and (p_max_mileage is null or v.mileage_km <= p_max_mileage)
      and (p_tags is null or v.tags @> p_tags)
      and (p_chinese is null or v.is_chinese = p_chinese)
      and (p_exclude_ids is null or not (v.id = any (p_exclude_ids)))
      and (p.feats is null or not exists (
            select 1 from unnest(p.feats) f where position(f in v.search_text) = 0))
      -- every word of the free text must be (nearly) there
      and (p.words is null or not exists (
            select 1 from unnest(p.words) w
             where position(w in v.search_text) = 0
               and extensions.word_similarity(w, v.search_text) < 0.6))
  )
  select
    id, brand, model, trim_level, year, price_iqd, condition, origin, body_type, mileage_km, fuel,
    transmission, drivetrain, seats, horsepower, engine, color, city, status, featured, tags,
    features, images -> 0 ->> 'path' as image, text_score as score,
    count(*) over () as total_count
  from matched
  order by
    case when p_sort = 'price_asc' then price_iqd end asc nulls last,
    case when p_sort = 'price_desc' then price_iqd end desc nulls last,
    case when p_sort = 'year_desc' then year end desc nulls last,
    case when p_sort = 'mileage_asc' then mileage_km end asc nulls last,
    text_score desc,
    (status = 'متوفرة') desc,
    featured desc,
    year desc,
    price_iqd desc
  limit least(greatest(coalesce(p_limit, 6), 1), 20);
$$;
comment on function public.search_cars is
  'Sadeem''s car search. Brand/model names may be English, Arabic or any alias; enum filters use the catalog''s Arabic values.';

-- What is in stock, for Sadeem's system prompt: makes, models, cities, ranges.
create or replace function public.catalog_overview()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'available', (select count(*) from public.cars where status = 'متوفرة'),
    'brands', (
      select jsonb_agg(jsonb_build_object(
               'name', b.name, 'name_ar', b.name_ar, 'chinese', b.is_chinese,
               'models', (select jsonb_agg(jsonb_build_object('name', m.name, 'name_ar', m.name_ar,
                                   'cars', (select count(*) from public.cars c
                                             where c.model_id = m.id and c.status <> 'مباعة'))
                                   order by m.name)
                            from public.models m where m.brand_id = b.id))
             order by b.name)
        from public.brands b
       where exists (select 1 from public.models m join public.cars c on c.model_id = m.id
                      where m.brand_id = b.id and c.status <> 'مباعة')),
    'cities', (select jsonb_agg(distinct city) from public.cars where status <> 'مباعة'),
    'price_range', (select jsonb_build_object('min', min(price_iqd), 'max', max(price_iqd))
                      from public.cars where status <> 'مباعة'),
    'years', (select jsonb_build_object('min', min(year), 'max', max(year))
                from public.cars where status <> 'مباعة')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.brands enable row level security;
alter table public.models enable row level security;
alter table public.cars enable row level security;
alter table public.features enable row level security;
alter table public.car_features enable row level security;
alter table public.car_images enable row level security;
alter table public.leads enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

create policy "catalog is public" on public.brands for select to anon, authenticated using (true);
create policy "catalog is public" on public.models for select to anon, authenticated using (true);
create policy "catalog is public" on public.cars for select to anon, authenticated using (true);
create policy "catalog is public" on public.features for select to anon, authenticated using (true);
create policy "catalog is public" on public.car_features for select to anon, authenticated using (true);
create policy "catalog is public" on public.car_images for select to anon, authenticated using (true);
-- leads, chat_sessions, chat_messages: no policies, server (secret key) only.

revoke execute on function public.touch_updated_at() from anon, authenticated;
