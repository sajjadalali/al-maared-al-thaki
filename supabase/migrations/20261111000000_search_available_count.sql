-- search_cars also returns available_count: the matches that can be bought
-- now (status متوفرة). total_count counts reserved cars too, and Sadeem quoted
-- it as "أكو 34 سيارة" while 33 were available.
-- Adding an output column changes the return type, so the function is
-- dropped and created again, with its comment and grants.

drop function public.search_cars(
  text, text[], text[], text[], text, text[], text[], text, text[], text[], bigint, bigint,
  integer, integer, integer, integer, text[], text[], boolean, boolean, text[], text, integer
);

create function public.search_cars(
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
  image text, score real, total_count bigint, available_count bigint
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
    count(*) over () as total_count,
    count(*) filter (where status = 'متوفرة') over () as available_count
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

grant execute on function public.search_cars to anon, authenticated, service_role;
